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

    // Multi-kill tracking: consecutive kills within the time window, per slot.
    private readonly Dictionary<int, int> _multiKill = new();
    private readonly Dictionary<int, CounterStrikeSharp.API.Modules.Timers.Timer?> _multiKillTimers = new();

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

        // Re-apply DM cvars on each map (they reset on map change) and right now,
        // so loading mid-map (css_plugins load) takes effect immediately.
        RegisterListener<Listeners.OnMapStart>(_ => AddTimer(2.0f, ApplyDmCvars));
        AddTimer(2.0f, ApplyDmCvars);

        Logger.LogInformation(
            "IntradarkDeathmatch loaded (respawn {d}s, FFA={ffa}).",
            Config.RespawnDelaySeconds, Config.FreeForAll);
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
        // Slight delay so the pawn is fully set up before we hand out weapons.
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
    }

    /// <summary>Track a kill in the multi-kill window and show the tier banner.</summary>
    private void AnnounceMultiKill(CCSPlayerController killer)
    {
        var slot = killer.Slot;
        var n = _multiKill.TryGetValue(slot, out var c) ? c + 1 : 1;
        _multiKill[slot] = n;

        // (Re)start the window: streak resets if no kill within MultiKillWindowSeconds.
        if (_multiKillTimers.TryGetValue(slot, out var old)) old?.Kill();
        _multiKillTimers[slot] = AddTimer(Config.MultiKillWindowSeconds, () => _multiKill[slot] = 0);

        if (n < 2) return; // single kills don't get a banner
        var (label, color) = MultiKillTier(n);

        // Hold the banner: OnTick re-paints it so it stays solid; reset the
        // clear timer so chaining kills keeps (and escalates) the banner.
        _centerHold[slot] = $"<font color='{color}'>{label}</font>";
        if (_centerHoldTimers.TryGetValue(slot, out var oldHold)) oldHold?.Kill();
        _centerHoldTimers[slot] =
            AddTimer(Config.MultiKillBannerSeconds, () => _centerHold.Remove(slot));

        if (Config.MultiKillChat)
            killer.PrintToChat($"{Colorize(Config.ChatPrefix)} {ChatColors.Gold}{label}!");
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
