import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(
  res: ServerResponse,
  status: number,
  body: Record<string, unknown>,
): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export interface GcBotHttpOptions {
  port: number;
  secret: string;
  isReady: () => boolean;
  /** Called when the Next app pokes us to drain a specific steamid64. */
  onPoke: (steamid64: string) => Promise<void> | void;
}

/**
 * Bearer-guarded HTTP control API for the GC bot, mirroring discord-bot's
 * pattern: unauthenticated /health, 127.0.0.1 bind, POST /profile to nudge a
 * drain for a steamid64.
 */
export function startGcBotHttpServer(
  opts: GcBotHttpOptions,
): ReturnType<typeof createServer> {
  const { port, secret, isReady, onPoke } = opts;

  const server = createServer(async (req, res) => {
    if (!req.url || !req.method) {
      json(res, 404, { ok: false, error: "not_found" });
      return;
    }

    const url = new URL(req.url, `http://127.0.0.1:${port}`);

    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, ready: isReady() });
      return;
    }

    const auth = req.headers.authorization?.trim();
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : undefined;
    if (bearer !== secret) {
      json(res, 401, { ok: false, error: "unauthorized" });
      return;
    }

    try {
      if (req.method === "POST" && url.pathname === "/profile") {
        const raw = await readBody(req);
        let body: Record<string, unknown> = {};
        try {
          body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          json(res, 400, { ok: false, error: "invalid_json" });
          return;
        }
        const steamid64 =
          typeof body.steamid64 === "string"
            ? body.steamid64
            : typeof body.steamid64 === "number"
              ? String(body.steamid64)
              : "";
        if (!/^\d{17}$/.test(steamid64)) {
          json(res, 400, { ok: false, error: "invalid_steamid64" });
          return;
        }
        // Fire-and-forget the drain; the row is already queued by the API.
        void Promise.resolve(onPoke(steamid64)).catch((e) =>
          console.error("[gc] onPoke error", e),
        );
        json(res, 202, { ok: true, ready: isReady() });
        return;
      }

      json(res, 404, { ok: false, error: "not_found" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[http]", e);
      json(res, 500, { ok: false, error: msg });
    }
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`GC bot HTTP control listening on http://127.0.0.1:${port}`);
  });

  return server;
}
