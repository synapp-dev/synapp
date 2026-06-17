namespace IntradarkDeathmatch;

/// <summary>
/// Seam for Phase 4 website integration. Holds the Intradark base URL + a shared
/// HttpClient so we can later add calls like `GET /api/cs2/deathmatch/rank/{id}`
/// to drive in-game `!rank` / `!top` and "Welcome back, you're #N" messages —
/// reading the same stats the IntradarkDmStats plugin feeds. Intentionally inert
/// in Phase 1; nothing calls it yet.
/// </summary>
public sealed class IntradarkApi : IDisposable
{
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(10) };
    private readonly string _baseUrl;

    public IntradarkApi(string baseUrl)
    {
        _baseUrl = baseUrl.TrimEnd('/');
    }

    // TODO (Phase 4): Task<PlayerRank?> GetRankAsync(string steamId64) → GET {_baseUrl}/api/...
    // TODO (Phase 4): Task<IReadOnlyList<TopRow>> GetTopAsync(int n) → GET {_baseUrl}/api/...

    public void Dispose() => _http.Dispose();
}
