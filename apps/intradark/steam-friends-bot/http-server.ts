import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

function json(res: ServerResponse, status: number, body: Record<string, unknown>): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export interface FriendsBotHttpOptions {
  port: number;
  secret: string;
  isReady: () => boolean;
  /** Nudge the worker to drain the job queue immediately. */
  onPoke: () => Promise<void> | void;
}

/**
 * Bearer-guarded localhost control API, mirroring discord-bot / cs2-gc-bot:
 * unauthenticated GET /health, 127.0.0.1 bind, authenticated POST /poke to trigger
 * an immediate drain (used for latency-sensitive match pops + admin broadcasts;
 * everything else is caught by the 5s backstop poll).
 */
export function startFriendsBotHttpServer(
  opts: FriendsBotHttpOptions,
): ReturnType<typeof createServer> {
  const { port, secret, isReady, onPoke } = opts;

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
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

    if (req.method === "POST" && url.pathname === "/poke") {
      void Promise.resolve(onPoke()).catch((e) => console.error("[http] onPoke error", e));
      json(res, 202, { ok: true, ready: isReady() });
      return;
    }

    json(res, 404, { ok: false, error: "not_found" });
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Friends bot HTTP control listening on http://127.0.0.1:${port}`);
  });

  return server;
}
