using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using CounterStrikeSharp.API.Modules.Utils;

namespace IntradarkDeathmatch;

/// <summary>One deathmatch spawn point parsed from a map's spawns JSON.</summary>
public readonly record struct SpawnPoint(Vector Position, QAngle Angle, string Team);

/// <summary>
/// Loads per-map deathmatch spawn points from <c>spawns/&lt;map&gt;.json</c>
/// (shipped next to the plugin) and serves random ones for respawns.
///
/// File format matches CS2-Deathmatch's: <c>{ "spawnpoints": [ { team, pos,
/// angle } ] }</c> where <c>pos</c>/<c>angle</c> are space-separated and may
/// carry thousands-commas (e.g. <c>"1,332.40 492.02 -259.52"</c>).
/// </summary>
public sealed class SpawnManager
{
    private readonly Random _rng = new();
    private readonly List<SpawnPoint> _spawns = new();

    public int Count => _spawns.Count;
    public string LoadedMap { get; private set; } = "";

    /// <summary>Load spawns for a map. Returns the number loaded (0 = missing/failed).</summary>
    public int Load(string moduleDirectory, string mapName)
    {
        _spawns.Clear();
        LoadedMap = mapName;

        var path = Path.Combine(moduleDirectory, "spawns", mapName + ".json");
        if (!File.Exists(path)) return 0;

        try
        {
            var file = JsonSerializer.Deserialize<SpawnFile>(File.ReadAllText(path));
            if (file?.Spawnpoints is null) return 0;
            foreach (var s in file.Spawnpoints)
            {
                if (TryParse3(s.Pos, out var pos) && TryParse3(s.Angle, out var ang))
                {
                    _spawns.Add(new SpawnPoint(
                        new Vector(pos[0], pos[1], pos[2]),
                        new QAngle(ang[0], ang[1], ang[2]),
                        s.Team ?? ""));
                }
            }
        }
        catch
        {
            _spawns.Clear();
        }
        return _spawns.Count;
    }

    /// <summary>A random spawn from all loaded points (FFA), or null if none.</summary>
    public SpawnPoint? Random() => _spawns.Count == 0 ? null : _spawns[_rng.Next(_spawns.Count)];

    /// <summary>Parse "x y z" (optional thousands-commas) into three floats.</summary>
    private static bool TryParse3(string? s, out float[] outv)
    {
        outv = new float[3];
        if (string.IsNullOrWhiteSpace(s)) return false;
        var parts = s.Replace(",", "").Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 3) return false;
        for (var i = 0; i < 3; i++)
        {
            if (!float.TryParse(parts[i], NumberStyles.Float, CultureInfo.InvariantCulture, out outv[i]))
                return false;
        }
        return true;
    }

    private sealed class SpawnFile
    {
        [JsonPropertyName("spawnpoints")]
        public List<SpawnEntry>? Spawnpoints { get; set; }
    }

    private sealed class SpawnEntry
    {
        [JsonPropertyName("team")] public string? Team { get; set; }
        [JsonPropertyName("pos")] public string? Pos { get; set; }
        [JsonPropertyName("angle")] public string? Angle { get; set; }
    }
}
