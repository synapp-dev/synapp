using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Modules.Admin;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Timers;
using CounterStrikeSharp.API.Modules.Utils;
using Microsoft.Extensions.Logging;

namespace IntradarkDeathmatch;

/// <summary>
/// Intradark's own deathmatch game mode (Phase 1: core loop). Inspired by
/// CS2-Deathmatch but written from scratch so we own it and can bake website
/// integration in later (see IntradarkApi). Runs the mode itself: auto-respawn,
/// default loadout on spawn, DM-friendly cvars, and Intradark-branded messaging.
///
/// Roadmap: P2 = !guns weapon menu + persistence; P3 = spawn protection,
/// multi-kill announcer, ammo/health refill; P4 = website (!rank / !top /
/// welcome-with-stats) via IntradarkApi against the leaderboard we already built.
/// </summary>
public sealed class IntradarkDeathmatch : BasePlugin, IPluginConfig<DmConfig>
{
    public override string ModuleName => "IntradarkDeathmatch";
    public override string ModuleVersion => "0.1.0";
    public override string ModuleAuthor => "Intradark";
    public override string ModuleDescription =>
        "Intradark-branded deathmatch game mode (CounterStrikeSharp).";

    public DmConfig Config { get; set; } = new();
    private IntradarkApi? _api;
    private readonly SpawnManager _spawns = new();

    // Multi-kill tracking: consecutive kills WITHOUT dying, per slot. Resets only
    // when the player dies — no time window, so slow chains still count.
    private readonly Dictionary<int, int> _multiKill = new();

    // Damage dealt this life, keyed by (attacker slot, victim slot) → (hp damage, hits).
    // Cleared for a player when they die (fresh on respawn).
    private readonly Dictionary<(int attacker, int victim), (int dmg, int hits)> _damage = new();

    // Center-banner hold: slot -> html to re-paint every tick until its hold timer
    // clears it. Re-painting is what keeps CS2 center text solid (a single
    // PrintToCenterHtml fades almost instantly).
    private readonly Dictionary<int, string> _centerHold = new();
    private readonly Dictionary<int, CounterStrikeSharp.API.Modules.Timers.Timer?> _centerHoldTimers = new();

    public void OnConfigParsed(DmConfig config) => Config = config;

    public override void Load(bool hotReload)
    {
        _api = new IntradarkApi(Config.ApiBaseUrl); // wired for Phase 4; inert now

        RegisterEventHandler<EventPlayerDeath>(OnPlayerDeath);
        RegisterEventHandler<EventPlayerHurt>(OnPlayerHurt);
        RegisterEventHandler<EventPlayerSpawn>(OnPlayerSpawn);
        RegisterEventHandler<EventPlayerConnectFull>(OnConnectFull);
        RegisterListener<Listeners.OnTick>(OnTick);

        // Re-apply DM cvars + reload spawns on each map (both reset on map change)
        // and right now, so loading mid-map (css_plugins load) takes effect immediately.
        RegisterListener<Listeners.OnMapStart>(mapName =>
        {
            AddTimer(2.0f, ApplyDmCvars);
            AddTimer(2.5f, ApplyBotCvars); // after DM cvars + mp_restartgame
            LoadSpawns(mapName);
        });
        AddTimer(2.0f, ApplyDmCvars);
        AddTimer(2.5f, ApplyBotCvars);
        LoadSpawns(Server.MapName);

        Logger.LogInformation(
            "IntradarkDeathmatch loaded (respawn {d}s, FFA={ffa}, randomSpawns={rs}).",
            Config.RespawnDelaySeconds, Config.FreeForAll, Config.RandomSpawns);
    }

    public override void Unload(bool hotReload) => _api?.Dispose();

    // -- admin commands -------------------------------------------------------

    /// <summary>
    /// Run any server command from the client console (or `!rcon` in chat).
    /// Root-only — gated by admins.json (@css/root). Lets an admin drive the
    /// server (bot_quota, host_workshop_map, mp_*, etc.) without the server window.
    /// </summary>
    [ConsoleCommand("css_rcon", "Run a server command (root only)")]
    [RequiresPermissions("@css/root")]
    public void OnRconCommand(CCSPlayerController? player, CommandInfo command)
    {
        if (command.ArgCount < 2)
        {
            command.ReplyToCommand("Usage: css_rcon <command> [args]");
            return;
        }

        var cmd = command.ArgString.Trim();
        Server.ExecuteCommand(cmd);
        command.ReplyToCommand($"{Colorize(Config.ChatPrefix)} ran: {cmd}");
        Logger.LogInformation("[rcon] {who} -> {cmd}",
            player?.PlayerName ?? "console", cmd);
    }

    // -- core loop ------------------------------------------------------------

    private HookResult OnPlayerDeath(EventPlayerDeath ev, GameEventInfo info)
    {
        var player = ev.Userid;
        if (player is null || !player.IsValid) return HookResult.Continue;

        // Reward + announce for the killer (real kill, not suicide/world).
        var attacker = ev.Attacker;
        if (attacker is not null && attacker.IsValid && attacker.PawnIsAlive
            && attacker.Slot != player.Slot)
        {
            RewardKiller(attacker);
            if (Config.MultiKillAnnouncer) AnnounceMultiKill(attacker);
        }

        // Damage report (uses this-life damage), then clear the victim's totals.
        if (Config.DamageReportOnDeath) ShowDamageReport(player, attacker);

        var slot = player.Slot;
        _multiKill.Remove(slot);       // dying ends your kill streak
        ClearDamageFor(slot);          // and resets this-life damage totals

        AddTimer(Config.RespawnDelaySeconds, () =>
        {
            var p = Utilities.GetPlayerFromSlot(slot);
            if (p is null || !p.IsValid) return;     // null/invalid = slot freed
            if (p.Team <= CsTeam.Spectator) return;  // only T / CT
            if (p.PawnIsAlive) return;               // already respawned
            p.Respawn();
        });

        // Personal killfeed: drop the global death notice and re-send it only to
        // the humans involved, so each player sees just their own entries.
        if (Config.PersonalKillfeed)
        {
            info.DontBroadcast = true;
            if (!player.IsBot) ev.FireEventToClient(player);
            if (attacker is not null && attacker.IsValid && !attacker.IsBot && attacker.Slot != slot)
                ev.FireEventToClient(attacker);
        }
        return HookResult.Continue;
    }

    private HookResult OnPlayerHurt(EventPlayerHurt ev, GameEventInfo info)
    {
        var attacker = ev.Attacker;
        var victim = ev.Userid;
        if (attacker is null || victim is null || !attacker.IsValid || !victim.IsValid)
            return HookResult.Continue;
        if (attacker.Slot == victim.Slot) return HookResult.Continue; // ignore self-damage

        var key = (attacker.Slot, victim.Slot);
        var cur = _damage.TryGetValue(key, out var d) ? d : (dmg: 0, hits: 0);
        _damage[key] = (cur.dmg + ev.DmgHealth, cur.hits + 1);
        return HookResult.Continue;
    }

    private HookResult OnPlayerSpawn(EventPlayerSpawn ev, GameEventInfo info)
    {
        var player = ev.Userid;
        if (player is null || !player.IsValid || player.IsHLTV) return HookResult.Continue;

        // Pick the random spawn ONCE so the same-tick and next-frame teleports
        // land on the exact same spot: same-tick kills the base-spawn flicker
        // (it runs before this tick's snapshot is networked), next-frame re-asserts
        // it in case the engine re-places the pawn just after spawn.
        var spawn = Config.RandomSpawns ? _spawns.Random() : null;
        if (spawn is not null) ApplySpawn(player, spawn.Value);

        var slot = player.Slot;
        Server.NextFrame(() =>
        {
            var p = Utilities.GetPlayerFromSlot(slot);
            if (p is not null && p.IsValid && p.PawnIsAlive && spawn is not null)
                ApplySpawn(p, spawn.Value);
        });
        // Loadout after a short beat so the pawn is fully ready for weapon give.
        AddTimer(0.2f, () =>
        {
            var p = Utilities.GetPlayerFromSlot(slot);
            if (p is null || !p.IsValid || !p.PawnIsAlive) return;
            GiveLoadout(p);
        });
        return HookResult.Continue;
    }

    private HookResult OnConnectFull(EventPlayerConnectFull ev, GameEventInfo info)
    {
        if (!Config.WelcomeMessage) return HookResult.Continue;
        var player = ev.Userid;
        if (player is null || !player.IsValid || player.IsBot) return HookResult.Continue;

        Msg(player,
            "Welcome to {green}Intradark Deathmatch{default}! Live board: {green}intradark.com/leaderboards/deathmatch");
        return HookResult.Continue;
    }

    // -- helpers --------------------------------------------------------------

    /// <summary>Full heal + fresh armor on a kill (classic DM reward).</summary>
    private void RewardKiller(CCSPlayerController killer)
    {
        if (Config.HealOnKill)
        {
            var pawn = killer.PlayerPawn?.Value;
            if (pawn is not null)
            {
                pawn.Health = 100;
                Utilities.SetStateChanged(pawn, "CBaseEntity", "m_iHealth", 0);
            }
        }
        if (Config.ArmorOnKill)
            killer.GiveNamedItem("item_assaultsuit");
        if (Config.RefillAmmoOnKill)
            RefillAmmo(killer);
    }

    /// <summary>Top up clip + reserve ammo on every clip-based weapon the player holds.</summary>
    private static void RefillAmmo(CCSPlayerController player)
    {
        var weapons = player.PlayerPawn?.Value?.WeaponServices?.MyWeapons;
        if (weapons is null) return;

        foreach (var handle in weapons)
        {
            var weapon = handle.Value;
            if (weapon is null || !weapon.IsValid) continue;

            var data = weapon.As<CCSWeaponBase>().VData;
            if (data is null || data.MaxClip1 <= 0) continue; // skip knife / grenades

            weapon.Clip1 = data.MaxClip1;
            weapon.ReserveAmmo[0] = data.PrimaryReserveAmmoMax;
            Utilities.SetStateChanged(weapon, "CBasePlayerWeapon", "m_iClip1");
            Utilities.SetStateChanged(weapon, "CBasePlayerWeapon", "m_pReserveAmmo");
        }
    }

    /// <summary>Bump the killer's no-death streak and announce the tier (2+).</summary>
    private void AnnounceMultiKill(CCSPlayerController killer)
    {
        var slot = killer.Slot;
        var n = _multiKill.TryGetValue(slot, out var c) ? c + 1 : 1;
        _multiKill[slot] = n;

        if (n < 2) return; // first kill of a life isn't a multi-kill
        var (label, html, chat) = MultiKillTier(n);

        // Hold the center banner: OnTick re-paints it so it stays solid; reset the
        // clear timer so chaining kills keeps (and escalates) the banner. Leading
        // <br> lines push it lower on the HUD (CS2 center text anchors near the top).
        var drop = string.Concat(Enumerable.Repeat("<br>", Math.Max(0, Config.MultiKillBannerOffsetLines)));
        _centerHold[slot] = $"{drop}<font color='{html}'>{label}</font>";
        if (_centerHoldTimers.TryGetValue(slot, out var oldHold)) oldHold?.Kill();
        _centerHoldTimers[slot] =
            AddTimer(Config.MultiKillBannerSeconds, () => _centerHold.Remove(slot));

        // [Intradark] >> name got a Double Kill!
        var line = $"{Colorize(Config.ChatPrefix)} {ChatColors.Grey}>> {TeamColor(killer.Team)}{killer.PlayerName} " +
                   $"{ChatColors.Default}got a {chat}{label}{ChatColors.Default}!";

        // Big streaks broadcast to everyone; smaller ones only to the killer.
        if (n >= Config.ServerAnnounceThreshold)
            Server.PrintToChatAll(line);
        else if (Config.MultiKillChat)
            killer.PrintToChat(line);
    }

    /// <summary>Show both players a damage report for the kill, then clear the victim's totals.</summary>
    private void ShowDamageReport(CCSPlayerController victim, CCSPlayerController? killer)
    {
        if (killer is null || !killer.IsValid || killer.Slot == victim.Slot) return; // suicide/world

        var dealt = _damage.TryGetValue((victim.Slot, killer.Slot), out var a) ? a : (dmg: 0, hits: 0);
        var taken = _damage.TryGetValue((killer.Slot, victim.Slot), out var b) ? b : (dmg: 0, hits: 0);

        // Victim's view: dealt = what they did to the killer, taken = what killed them.
        victim.PrintToChat(
            $"{Colorize(Config.ChatPrefix)} {ChatColors.Default}Killed by {TeamColor(killer.Team)}{killer.PlayerName} " +
            $"{ChatColors.Default}— dealt {ChatColors.Green}{dealt.dmg}{ChatColors.Default} ({dealt.hits} hits), " +
            $"took {ChatColors.LightRed}{taken.dmg}{ChatColors.Default} ({taken.hits} hits)");

        // Killer's view is the mirror image.
        killer.PrintToChat(
            $"{Colorize(Config.ChatPrefix)} {ChatColors.Default}Killed {TeamColor(victim.Team)}{victim.PlayerName} " +
            $"{ChatColors.Default}— dealt {ChatColors.Green}{taken.dmg}{ChatColors.Default} ({taken.hits} hits), " +
            $"took {ChatColors.LightRed}{dealt.dmg}{ChatColors.Default} ({dealt.hits} hits)");
    }

    /// <summary>Drop all damage pairs that involve a slot (called on death → fresh next life).</summary>
    private void ClearDamageFor(int slot)
    {
        foreach (var key in _damage.Keys.Where(k => k.attacker == slot || k.victim == slot).ToList())
            _damage.Remove(key);
    }

    /// <summary>CS2 chat color for a team's name (CT blue, T yellow).</summary>
    private static char TeamColor(CsTeam team) => team switch
    {
        CsTeam.CounterTerrorist => ChatColors.Blue,
        CsTeam.Terrorist => ChatColors.Yellow,
        _ => ChatColors.White,
    };

    /// <summary>Re-paint held center banners every tick (keeps CS2 center text solid).</summary>
    private void OnTick()
    {
        if (_centerHold.Count == 0) return;
        foreach (var (slot, html) in _centerHold.ToList())
        {
            var p = Utilities.GetPlayerFromSlot(slot);
            if (p is null || !p.IsValid) continue;
            p.PrintToCenterHtml(html);
        }
    }

    // Label, center-banner HTML color, and chat color (char) per streak tier.
    private static (string Label, string Html, char Chat) MultiKillTier(int n) => n switch
    {
        2 => ("Double Kill", "#ffd200", ChatColors.Yellow),
        3 => ("Triple Kill", "#ff9a00", ChatColors.Gold),
        4 => ("Multi Kill", "#ff5a00", ChatColors.LightRed),
        5 => ("Mega Kill", "#ff2a00", ChatColors.Red),
        6 => ("Ultra Kill", "#ff00aa", ChatColors.Purple),
        _ => ("Godlike", "#b400ff", ChatColors.Purple),
    };

    /// <summary>Load the current map's random-spawn points and log the count.</summary>
    private void LoadSpawns(string mapName)
    {
        if (string.IsNullOrEmpty(mapName)) return;
        var n = _spawns.Load(ModuleDirectory, mapName);
        Logger.LogInformation("Loaded {n} random spawn(s) for {map}.", n, mapName);
    }

    /// <summary>Teleport a player to a specific spawn point, zeroing velocity.</summary>
    private static void ApplySpawn(CCSPlayerController p, SpawnPoint spawn)
    {
        var pawn = p.PlayerPawn?.Value;
        if (pawn is null) return;
        pawn.Teleport(spawn.Position, spawn.Angle, new Vector(0, 0, 0));
    }

    private void GiveLoadout(CCSPlayerController p)
    {
        p.RemoveWeapons();
        p.GiveNamedItem("weapon_knife");
        if (!string.IsNullOrWhiteSpace(Config.DefaultSecondary))
            p.GiveNamedItem(Config.DefaultSecondary);
        if (!string.IsNullOrWhiteSpace(Config.DefaultPrimary))
            p.GiveNamedItem(Config.DefaultPrimary);
        if (Config.GiveArmor)
            p.GiveNamedItem("item_assaultsuit");
    }

    private void ApplyDmCvars()
    {
        string[] cvars =
        {
            "mp_ignore_round_win_conditions 1",
            "mp_respawn_immunitytime 0",
            "mp_freezetime 0",
            "mp_warmuptime 0",
            "mp_roundtime 60",
            "mp_roundtime_defuse 60",
            "mp_roundtime_hostage 60",
            "mp_buytime 0",
            "mp_maxmoney 0",
            "mp_startmoney 0",
            "mp_playercashawards 0", // no +$300 "Enemy Neutralized" money feed
            "mp_teamcashawards 0",
            "mp_death_drop_gun 0",
            "mp_death_drop_grenade 0",
            "mp_death_drop_defuser 0",
            "mp_respawn_on_death_ct 0",
            "mp_respawn_on_death_t 0",
            "mp_autoteambalance 0",
            "mp_limitteams 0",
        };
        foreach (var c in cvars) Server.ExecuteCommand(c);
        Server.ExecuteCommand(
            Config.FreeForAll ? "mp_teammates_are_enemies 1" : "mp_teammates_are_enemies 0");
        Server.ExecuteCommand("mp_restartgame 1");
    }

    /// <summary>
    /// Auto-fill empty slots with roaming bots. `bot_quota_mode fill` keeps the
    /// player count at BotQuota by adding bots and dropping them as humans join.
    /// `bot_zombie 0` + `bot_stop 0` ensures they actually move and fight (they
    /// still need a nav mesh — official maps have one; some workshop maps don't).
    /// </summary>
    private void ApplyBotCvars()
    {
        if (!Config.EnableBots)
        {
            Server.ExecuteCommand("bot_quota 0");
            return;
        }

        string[] cvars =
        {
            "bot_zombie 0",
            "bot_stop 0",
            "bot_dont_shoot 0",
            "bot_join_after_player 0",
            "bot_join_team any",
            $"bot_difficulty {Math.Clamp(Config.BotDifficulty, 0, 3)}",
            "bot_allow_rifles 1",
            "bot_allow_pistols 1",
            "bot_allow_snipers 1",
            "bot_allow_shotguns 1",
            "bot_allow_machine_guns 1",
            "bot_allow_grenades 1",
            "bot_quota_mode fill",
            $"bot_quota {Math.Max(0, Config.BotQuota)}",
        };
        foreach (var c in cvars) Server.ExecuteCommand(c);

        Logger.LogInformation("Bots: fill to {q} (difficulty {d}).", Config.BotQuota, Config.BotDifficulty);
    }

    /// <summary>Send a prefixed, colorized chat line to one player.</summary>
    private void Msg(CCSPlayerController player, string text) =>
        player.PrintToChat($"{Colorize(Config.ChatPrefix)} {Colorize(text)}");

    /// <summary>Replace {tag} placeholders with CS2 chat color characters.</summary>
    private static string Colorize(string s) => s
        .Replace("{default}", $"{ChatColors.Default}")
        .Replace("{white}", $"{ChatColors.White}")
        .Replace("{purple}", $"{ChatColors.Purple}")
        .Replace("{green}", $"{ChatColors.Green}")
        .Replace("{lightred}", $"{ChatColors.LightRed}")
        .Replace("{red}", $"{ChatColors.Red}")
        .Replace("{blue}", $"{ChatColors.Blue}")
        .Replace("{gold}", $"{ChatColors.Gold}")
        .Replace("{yellow}", $"{ChatColors.Yellow}");
}
