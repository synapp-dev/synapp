import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Client } from "discord.js";

import { buildTeamMap } from "./mock-roster.js";
import {
  deletePracticeChannels,
  startMatchSession,
  type StartMatchOptions,
} from "./match-session.js";

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
  body: Record<string, unknown>
): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function unauthorized(res: ServerResponse): void {
  json(res, 401, { ok: false, error: "unauthorized" });
}

export function startBotHttpServer(
  client: Client,
  opts: { port: number; secret: string }
): ReturnType<typeof createServer> {
  const { port, secret } = opts;

  const server = createServer(async (req, res) => {
    if (!req.url || !req.method) {
      json(res, 404, { ok: false, error: "not_found" });
      return;
    }

    const url = new URL(req.url, `http://127.0.0.1:${port}`);

    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, {
        ok: true,
        ready: client.isReady(),
        tag: client.isReady() ? client.user?.tag : null,
      });
      return;
    }

    const auth = req.headers.authorization?.trim();
    const bearer =
      auth?.startsWith("Bearer ") ? auth.slice(7).trim() : undefined;
    if (bearer !== secret) {
      unauthorized(res);
      return;
    }

    if (!client.isReady()) {
      json(res, 503, { ok: false, error: "bot_not_ready" });
      return;
    }

    try {
      if (req.method === "POST" && url.pathname === "/match/start") {
        const raw = await readBody(req);
        let body: Record<string, unknown> = {};
        try {
          body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          json(res, 400, { ok: false, error: "invalid_json" });
          return;
        }

        const team1Name =
          typeof body.team1Name === "string" ? body.team1Name : "";
        const team2Name =
          typeof body.team2Name === "string" ? body.team2Name : "";
        const teamAUserIds = Array.isArray(body.teamAUserIds)
          ? body.teamAUserIds.filter((x): x is string => typeof x === "string")
          : [];
        const teamBUserIds = Array.isArray(body.teamBUserIds)
          ? body.teamBUserIds.filter((x): x is string => typeof x === "string")
          : [];

        if (!team1Name.trim() || !team2Name.trim()) {
          json(res, 400, {
            ok: false,
            error: "team1Name_and_team2Name_required",
          });
          return;
        }

        const startOpts: StartMatchOptions = {
          team1Name: team1Name.trim(),
          team2Name: team2Name.trim(),
          teamAUserIds,
          teamBUserIds,
          useEnvRosterOnly: false,
        };

        const envTeamMap = buildTeamMap(process.env);
        const created = await startMatchSession(client, startOpts, envTeamMap);
        json(res, 200, { ok: true, ...created });
        return;
      }

      if (req.method === "POST" && url.pathname === "/match/end") {
        await deletePracticeChannels(client);
        json(res, 200, { ok: true });
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
    console.log(`Bot HTTP control listening on http://127.0.0.1:${port}`);
  });

  return server;
}
