using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Modules.Timers;
using CounterStrikeSharp.API.Modules.Utils;
using Microsoft.Extensions.Logging;

namespace IntradarkDmStats;

/// <summary>
/// Deathmatch stats emitter. Runs ALONGSIDE the gameplay deathmatch mod (it only
/// listens to events, never changes gameplay) and ships raw events to Intradark in
/// batches. See apps/intradark/docs/cs2-stats-leaderboard.md.
///
/// Flow: game event → buffer to local SQLite (durable) → every FlushIntervalSeconds
/// and on map end, POST unsent rows to /api/cs2/deathmatch/events (Bearer Secret) →
/// mark sent. Each event carries a GUID `eventId` so the API dedupes retried batches.
///
/// Bots are recorded with null steamids: the events are still captured (names live in
/// `raw`), but the leaderboard view ignores null ids, so bots never pollute stats.
/// </summary>
public sealed class IntradarkDmStats : BasePlugin, IPluginConfig<DmStatsConfig>
{
    public override string ModuleName => "IntradarkDmStats";
    public override string ModuleVersion => "0.1.0";
    public override string ModuleAuthor => "Intradark";
    public override string ModuleDescription =>
        "Deathmatch stats → Intradark leaderboard (HTTP batch ingest).";

    public DmStatsConfig Config { get; set; } = new();

    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(30) };
    private EventBuffer? _buffer;
    private string _ingestUrl = "";
    private bool _flushing;

    public void OnConfigParsed(DmStatsConfig config)
    {
        Config = config;
        _ingestUrl = config.ApiBaseUrl.TrimEnd('/') + config.IngestPath;
    }

    public override void Load(bool hotReload)
    {
        _buffer = new EventBuffer(Path.Combine(ModuleDirectory, "dm-stats.db"));

        RegisterEventHandler<EventPlayerDeath>(OnPlayerDeath);
        if (Config.CaptureHurtEvents)
        {
            RegisterEventHandler<EventPlayerHurt>(OnPlayerHurt);
        }
        RegisterEventHandler<EventPlayerConnectFull>(OnConnectFull);
        RegisterEventHandler<EventPlayerDisconnect>(OnDisconnect);

        // Repeat timer is cleared on map change, so (re)start it on each map start.
        RegisterListener<Listeners.OnMapStart>(_ => StartFlushTimer());
        RegisterListener<Listeners.OnMapEnd>(() => TriggerFlush());

        StartFlushTimer();
        Logger.LogInformation(
            "IntradarkDmStats loaded → {url} as '{server}' (flush every {s}s)",
            _ingestUrl, Config.ServerId, Config.FlushIntervalSeconds);
    }

    public override void Unload(bool hotReload)
    {
        TriggerFlush();
        _buffer?.Dispose();
        _http.Dispose();
    }

    private void StartFlushTimer()
    {
        AddTimer(Config.FlushIntervalSeconds, TriggerFlush, TimerFlags.REPEAT);
    }

    // -- event handlers -------------------------------------------------------

    private HookResult OnPlayerDeath(EventPlayerDeath ev, GameEventInfo info)
    {
        var attacker = ev.Attacker;
        var victim = ev.Userid;
        Buffer("death", new
        {
            attackerSteamId64 = SteamId(attacker),
            victimSteamId64 = SteamId(victim),
            assisterSteamId64 = SteamId(ev.Assister),
            weapon = ev.Weapon,
            headshot = ev.Headshot,
            noscope = ev.Noscope,
            penetrated = ev.Penetrated > 0,
            distance = ev.Distance,
            attackerPos = Pos(attacker),
            victimPos = Pos(victim),
            raw = new
            {
                attackerName = attacker?.PlayerName,
                victimName = victim?.PlayerName,
                attackerBot = attacker?.IsBot ?? false,
                victimBot = victim?.IsBot ?? false,
                ev.Penetrated,
                ev.Thrusmoke,
                ev.Attackerblind,
            },
        });
        return HookResult.Continue;
    }

    private HookResult OnPlayerHurt(EventPlayerHurt ev, GameEventInfo info)
    {
        Buffer("hurt", new
        {
            attackerSteamId64 = SteamId(ev.Attacker),
            victimSteamId64 = SteamId(ev.Userid),
            weapon = ev.Weapon,
            headshot = ev.Hitgroup == 1, // 1 == head
            raw = new
            {
                ev.DmgHealth,
                ev.DmgArmor,
                ev.Health,
                ev.Hitgroup,
            },
        });
        return HookResult.Continue;
    }

    private HookResult OnConnectFull(EventPlayerConnectFull ev, GameEventInfo info)
    {
        var player = ev.Userid;
        Buffer("connect", new
        {
            victimSteamId64 = SteamId(player),
            raw = new { name = player?.PlayerName, bot = player?.IsBot ?? false },
        });
        return HookResult.Continue;
    }

    private HookResult OnDisconnect(EventPlayerDisconnect ev, GameEventInfo info)
    {
        var player = ev.Userid;
        Buffer("disconnect", new
        {
            victimSteamId64 = SteamId(player),
            raw = new { name = player?.PlayerName, reason = ev.Reason },
        });
        return HookResult.Continue;
    }

    // -- buffering ------------------------------------------------------------

    /// <summary>Serialize an event and append it to the durable buffer.</summary>
    private void Buffer(string eventType, object fields)
    {
        if (_buffer is null) return;

        var eventId = $"{Config.ServerId}:{Guid.NewGuid():N}";
        var envelope = new Dictionary<string, object?>
        {
            ["eventId"] = eventId,
            ["eventType"] = eventType,
            ["mapName"] = Server.MapName,
            ["occurredAt"] = DateTime.UtcNow.ToString("o"),
        };
        // Merge the per-event fields onto the envelope.
        foreach (var prop in fields.GetType().GetProperties())
        {
            envelope[prop.Name] = prop.GetValue(fields);
        }

        try
        {
            _buffer.Enqueue(eventId, JsonSerializer.Serialize(envelope));
        }
        catch (Exception e)
        {
            Logger.LogError("buffer enqueue failed: {msg}", e.Message);
        }
    }

    // -- flushing -------------------------------------------------------------

    private void TriggerFlush() => _ = FlushAsync();

    private async Task FlushAsync()
    {
        if (_buffer is null || _flushing) return;
        _flushing = true;
        try
        {
            // Drain in batches until nothing is left (or a POST fails).
            while (true)
            {
                var batch = _buffer.TakeUnsent(Config.MaxBatch);
                if (batch.Count == 0) break;

                var body =
                    "{\"serverId\":" + JsonSerializer.Serialize(Config.ServerId) +
                    ",\"events\":[" + string.Join(",", batch.Select(b => b.Payload)) + "]}";

                using var req = new HttpRequestMessage(HttpMethod.Post, _ingestUrl);
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Config.Secret);
                req.Content = new StringContent(body, Encoding.UTF8, "application/json");

                var res = await _http.SendAsync(req).ConfigureAwait(false);
                if (!res.IsSuccessStatusCode)
                {
                    Logger.LogWarning(
                        "flush failed ({code}); {n} events kept for retry",
                        (int)res.StatusCode, batch.Count);
                    break;
                }

                _buffer.MarkSent(batch.Select(b => b.Id));
                if (batch.Count < Config.MaxBatch) break;
            }
        }
        catch (Exception e)
        {
            Logger.LogError("flush error: {msg}", e.Message);
        }
        finally
        {
            _flushing = false;
        }
    }

    // -- helpers --------------------------------------------------------------

    /// <summary>steamid64 as string, or null for bots/HLTV/invalid (filtered by the view).</summary>
    private static string? SteamId(CCSPlayerController? p)
    {
        if (p is null || !p.IsValid || p.IsBot || p.IsHLTV) return null;
        var id = p.SteamID;
        return id == 0 ? null : id.ToString();
    }

    private static object? Pos(CCSPlayerController? p)
    {
        var origin = p?.PlayerPawn?.Value?.AbsOrigin;
        if (origin is null) return null;
        return new { x = origin.X, y = origin.Y, z = origin.Z };
    }
}
