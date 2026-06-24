using System.Text.Json.Serialization;
using CounterStrikeSharp.API.Core;

namespace IntradarkDeathmatch;

/// <summary>
/// IntradarkDeathmatch config. CounterStrikeSharp generates the JSON file from
/// these defaults on first load (configs/plugins/IntradarkDeathmatch/…); edit it
/// there per server.
/// </summary>
public sealed class DmConfig : BasePluginConfig
{
    /// <summary>Chat prefix shown before plugin messages (supports CS2 color tags).</summary>
    [JsonPropertyName("ChatPrefix")]
    public string ChatPrefix { get; set; } = "{blue}[ ★ intradark]{default}";

    /// <summary>Seconds between death and respawn.</summary>
    [JsonPropertyName("RespawnDelaySeconds")]
    public float RespawnDelaySeconds { get; set; } = 2.0f;

    /// <summary>Free-for-all (everyone is an enemy) vs team deathmatch.</summary>
    [JsonPropertyName("FreeForAll")]
    public bool FreeForAll { get; set; } = true;

    /// <summary>
    /// Teleport each respawn to a random point from spawns/&lt;map&gt;.json
    /// instead of the map's CT/T spawns. Falls back to default spawns when no
    /// spawn file exists for the current map.
    /// </summary>
    [JsonPropertyName("RandomSpawns")]
    public bool RandomSpawns { get; set; } = true;

    /// <summary>Default primary weapon entity given on spawn (e.g. weapon_ak47).</summary>
    [JsonPropertyName("DefaultPrimary")]
    public string DefaultPrimary { get; set; } = "weapon_ak47";

    /// <summary>Default secondary weapon entity given on spawn (e.g. weapon_deagle).</summary>
    [JsonPropertyName("DefaultSecondary")]
    public string DefaultSecondary { get; set; } = "weapon_deagle";

    /// <summary>Give armor + helmet on spawn.</summary>
    [JsonPropertyName("GiveArmor")]
    public bool GiveArmor { get; set; } = true;

    /// <summary>Show the Intradark welcome message on connect.</summary>
    [JsonPropertyName("WelcomeMessage")]
    public bool WelcomeMessage { get; set; } = true;

    /// <summary>Fill empty player slots with bots (they leave as humans join).</summary>
    [JsonPropertyName("EnableBots")]
    public bool EnableBots { get; set; } = true;

    /// <summary>Total players (humans + bots) to fill to via bot_quota_mode fill.</summary>
    [JsonPropertyName("BotQuota")]
    public int BotQuota { get; set; } = 10;

    /// <summary>Bot skill: 0 easy → 3 expert.</summary>
    [JsonPropertyName("BotDifficulty")]
    public int BotDifficulty { get; set; } = 2;

    /// <summary>Restore the killer to full health on a kill.</summary>
    [JsonPropertyName("HealOnKill")]
    public bool HealOnKill { get; set; } = true;

    /// <summary>Give the killer fresh armor on a kill.</summary>
    [JsonPropertyName("ArmorOnKill")]
    public bool ArmorOnKill { get; set; } = true;

    /// <summary>Refill clip + reserve ammo on all the killer's weapons on a kill.</summary>
    [JsonPropertyName("RefillAmmoOnKill")]
    public bool RefillAmmoOnKill { get; set; } = true;

    /// <summary>Each player sees only killfeed entries involving themselves (hides everyone else's).</summary>
    [JsonPropertyName("PersonalKillfeed")]
    public bool PersonalKillfeed { get; set; } = true;

    /// <summary>Show on-screen multi-kill banners (Double Kill → Godlike).</summary>
    [JsonPropertyName("MultiKillAnnouncer")]
    public bool MultiKillAnnouncer { get; set; } = true;

    /// <summary>How long a multi-kill banner stays on screen (re-painted each tick).</summary>
    [JsonPropertyName("MultiKillBannerSeconds")]
    public float MultiKillBannerSeconds { get; set; } = 2.5f;

    /// <summary>Push the multi-kill banner down the HUD by this many lines (0 = default, higher = lower).</summary>
    [JsonPropertyName("MultiKillBannerOffsetLines")]
    public int MultiKillBannerOffsetLines { get; set; } = 3;

    /// <summary>Also send each multi-kill as a chat line to the killer (persistent log).</summary>
    [JsonPropertyName("MultiKillChat")]
    public bool MultiKillChat { get; set; } = true;

    /// <summary>Streak length (kills without dying) that gets announced to the whole server.</summary>
    [JsonPropertyName("ServerAnnounceThreshold")]
    public int ServerAnnounceThreshold { get; set; } = 5;

    /// <summary>On death, show both players a damage report (dealt / taken, with hits).</summary>
    [JsonPropertyName("DamageReportOnDeath")]
    public bool DamageReportOnDeath { get; set; } = true;

    /// <summary>
    /// Base URL of the Intradark site. Reserved for Phase 4 website integration
    /// (!rank / !top / welcome-with-stats). Unused in Phase 1.
    /// </summary>
    [JsonPropertyName("ApiBaseUrl")]
    public string ApiBaseUrl { get; set; } = "https://intradark.com";
}
