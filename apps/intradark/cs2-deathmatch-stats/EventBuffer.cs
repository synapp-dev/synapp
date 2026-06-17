using Microsoft.Data.Sqlite;

namespace IntradarkDmStats;

/// <summary>
/// Durable local buffer backed by SQLite. Every captured event is written here
/// immediately (the game server is the source of truth, so nothing is lost across
/// the frequent CS2 restarts / map changes). A flush reads unsent rows, POSTs them,
/// then marks them sent; sent rows are pruned. All access is serialized by a lock —
/// CSS event handlers run on the main thread, flushes run on a background task.
/// </summary>
public sealed class EventBuffer : IDisposable
{
    private readonly SqliteConnection _conn;
    private readonly object _lock = new();

    public EventBuffer(string dbPath)
    {
        _conn = new SqliteConnection($"Data Source={dbPath}");
        _conn.Open();
        using var cmd = _conn.CreateCommand();
        cmd.CommandText =
            "PRAGMA journal_mode=WAL;" +
            "CREATE TABLE IF NOT EXISTS events (" +
            "  id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "  event_id TEXT NOT NULL," +
            "  payload TEXT NOT NULL," + // full event JSON, ready to drop into the batch
            "  sent INTEGER NOT NULL DEFAULT 0" +
            ");";
        cmd.ExecuteNonQuery();
    }

    /// <summary>Append one event. `payloadJson` is the full event object as JSON.</summary>
    public void Enqueue(string eventId, string payloadJson)
    {
        lock (_lock)
        {
            using var cmd = _conn.CreateCommand();
            cmd.CommandText =
                "INSERT INTO events (event_id, payload) VALUES ($eid, $payload);";
            cmd.Parameters.AddWithValue("$eid", eventId);
            cmd.Parameters.AddWithValue("$payload", payloadJson);
            cmd.ExecuteNonQuery();
        }
    }

    /// <summary>Oldest unsent rows, up to `limit`.</summary>
    public List<(long Id, string Payload)> TakeUnsent(int limit)
    {
        lock (_lock)
        {
            var rows = new List<(long, string)>();
            using var cmd = _conn.CreateCommand();
            cmd.CommandText =
                "SELECT id, payload FROM events WHERE sent = 0 ORDER BY id LIMIT $limit;";
            cmd.Parameters.AddWithValue("$limit", limit);
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                rows.Add((reader.GetInt64(0), reader.GetString(1)));
            }
            return rows;
        }
    }

    /// <summary>Mark rows delivered, then prune them.</summary>
    public void MarkSent(IEnumerable<long> ids)
    {
        var list = ids.ToList();
        if (list.Count == 0) return;
        lock (_lock)
        {
            var names = string.Join(",", list.Select((_, i) => $"$id{i}"));
            using var cmd = _conn.CreateCommand();
            cmd.CommandText = $"DELETE FROM events WHERE id IN ({names});";
            for (var i = 0; i < list.Count; i++)
            {
                cmd.Parameters.AddWithValue($"$id{i}", list[i]);
            }
            cmd.ExecuteNonQuery();
        }
    }

    public int PendingCount()
    {
        lock (_lock)
        {
            using var cmd = _conn.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM events WHERE sent = 0;";
            return Convert.ToInt32(cmd.ExecuteScalar());
        }
    }

    public void Dispose()
    {
        lock (_lock)
        {
            _conn.Dispose();
        }
    }
}
