using System.Text.Json.Serialization;
using CounterStrikeSharp.API.Core;

namespace IntradarkDmStats;

/// <summary>
/// Plugin config. CounterStrikeSharp writes a JSON file from these defaults to
/// addons/counterstrikesharp/configs/plugins/IntradarkDmStats/IntradarkDmStats.json
/// on first load; edit it there (not here) per server.
/// </summary>
public sealed class DmStatsConfig : BasePluginConfig
{
    /// <summary>Base URL of the Intradark site, e.g. "https://intradark.com".</summary>
    [JsonPropertyName("ApiBaseUrl")]
    public string ApiBaseUrl { get; set; } = "http://127.0.0.1:3004";

    /// <summary>Ingest path; should not need changing.</summary>
    [JsonPropertyName("IngestPath")]
    public string IngestPath { get; set; } = "/api/cs2/deathmatch/events";

    /// <summary>Must equal CS2_DM_EVENTS_SECRET on the web app.</summary>
    [JsonPropertyName("Secret")]
    public string Secret { get; set; } = "dev-secret";

    /// <summary>Stable id for this server (e.g. "dm-syd-01"). Prefixes every event id.</summary>
    [JsonPropertyName("ServerId")]
    public string ServerId { get; set; } = "dm-unnamed";

    /// <summary>How often to flush buffered events to the API, in seconds.</summary>
    [JsonPropertyName("FlushIntervalSeconds")]
    public float FlushIntervalSeconds { get; set; } = 900f;

    /// <summary>Max events per POST batch.</summary>
    [JsonPropertyName("MaxBatch")]
    public int MaxBatch { get; set; } = 500;

    /// <summary>
    /// Capture player_hurt events too. Very high volume in deathmatch — off by
    /// default. Deaths/connects/disconnects are always captured.
    /// </summary>
    [JsonPropertyName("CaptureHurtEvents")]
    public bool CaptureHurtEvents { get; set; } = false;
}
