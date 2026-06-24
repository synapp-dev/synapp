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

        var slot = player.Slot;
        _multiKill.Remove(slot); // dying ends your kill streak

        AddTimer(Config.RespawnDelaySeconds, () =>
        {
            var p = Utilities.GetPlayerFromSlot(slot);
            if (p is null || !p.IsValid) return;     // null/invalid = slot freed
            if (p.Team <= CsTeam.Spectator) return;  // only T / CT
            if (p.PawnIsAlive) return;               // already respawned
            p.Respawn();
        });
        return HookResult.Continue;
    }

    private HookResult OnPlayerSpawn(EventPlayerSpawn ev, GameEventInfo info)
    {
        var player = ev.Userid;
        if (player is null || !player.IsValid || player.IsHLTV) return HookResult.Continue;

        var slot = player.Slot;
        // Slight delay so the pawn is fully set up before we move it / hand out weapons.
        AddTimer(0.2f, () =>
        {
            var p = Utilities.GetPlayerFromSlot(slot);
            if (p is null || !p.IsValid || !p.PawnIsAlive) return;
            TeleportToRandomSpawn(p);
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
        var (label, color) = MultiKillTier(n);

        // Hold the banner: OnTick re-paints it so it stays solid; reset the
        // clear timer so chaining kills keeps (and escalates) the banner.
        _centerHold[slot] = $"<font color='{color}'>{label}</font>";
        if (_centerHoldTimers.TryGetValue(slot, out var oldHold)) oldHold?.Kill();
        _centerHoldTimers[slot] =
            AddTimer(Config.MultiKillBannerSeconds, () => _centerHold.Remove(slot));

        // Chat line — sent only to the killer.
        if (Config.MultiKillChat)
            killer.PrintToChat($"{Colorize(Config.ChatPrefix)} {ChatColors.Gold}{label}! {ChatColors.Default}({n} kills, no deaths)");
    }

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

    private static (string Label, string Color) MultiKillTier(int n) => n switch
    {
        2 => ("DOUBLE KILL", "#ffd200"),
        3 => ("TRIPLE KILL", "#ff9a00"),
        4 => ("MULTI KILL", "#ff5a00"),
        5 => ("MEGA KILL", "#ff2a00"),
        6 => ("ULTRA KILL", "#ff00aa"),
        _ => ("GODLIKE", "#b400ff"),
    };

    /// <summary>Load the current map's random-spawn points and log the count.</summary>
    private void LoadSpawns(string mapName)
    {
        if (string.IsNullOrEmpty(mapName)) return;
        var n = _spawns.Load(ModuleDirectory, mapName);
        Logger.LogInformation("Loaded {n} random spawn(s) for {map}.", n, mapName);
    }

    /// <summary>Teleport a freshly-spawned player to a random spawn point (FFA, any team).</summary>
    private void TeleportToRandomSpawn(CCSPlayerController p)
    {
        if (!Config.RandomSpawns) return;
        var spawn = _spawns.Random();
        if (spawn is null) return; // no spawn file for this map → keep default spawn

        var pawn = p.PlayerPawn?.Value;
        if (pawn is null) return;
        pawn.Teleport(spawn.Value.Position, spawn.Value.Angle, new Vector(0, 0, 0));
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
