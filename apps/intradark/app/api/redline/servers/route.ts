import { NextResponse } from "next/server";
import { z } from "zod";

import { redline } from "@/entities/redline/lib/client";
import { guardRedlineRoute, redlineErrorResponse } from "@/entities/redline/lib/guard";
import { buildCreateInput } from "@/entities/redline/lib/provisioning";
import { resolveGsltToken } from "@/entities/redline/lib/gslt";
import { redactEnvironment } from "@/entities/redline/lib/redact";

/**
 * GET  /api/redline/servers  → list all servers
 * POST /api/redline/servers  → create a server (pug or community)
 *
 * The POST body mirrors the provisioning helper: pass a plugins zip URL and it
 * is folded into `environment` under the egg's plugin var; pass arbitrary
 * `environment` to experiment from the test harness.
 */

const createSchema = z.object({
  name: z.string().min(1).max(255),
  egg: z.string().min(1),
  location: z.string().min(1),
  pluginsZipUrl: z.string().url().optional(),
  environment: z.record(z.string(), z.string()).optional(),
  startOnCompletion: z.boolean().optional(),
  /** Named GSLT reference; resolved server-side to STEAM_ACC (token never sent by client). */
  steamAccountRef: z.string().optional(),
});

export async function GET() {
  const denied = await guardRedlineRoute();
  if (denied) return denied;

  try {
    const data = await redline.listServers();
    return NextResponse.json(data);
  } catch (err) {
    return redlineErrorResponse(err);
  }
}

export async function POST(request: Request) {
  const denied = await guardRedlineRoute();
  if (denied) return denied;

  let parsed;
  try {
    parsed = createSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid body", detail: err instanceof Error ? err.message : err },
      { status: 400 },
    );
  }

  // Resolve a named GSLT reference to its token server-side; the client never
  // holds it. An explicit ref that isn't configured is a hard error.
  const { steamAccountRef, ...rest } = parsed;
  const environment = { ...(rest.environment ?? {}) };
  if (steamAccountRef) {
    const token = resolveGsltToken(steamAccountRef);
    if (!token) {
      return NextResponse.json(
        { error: `GSLT reference "${steamAccountRef}" is unknown or its env var is not set` },
        { status: 400 },
      );
    }
    environment.STEAM_ACC = token;
  }

  try {
    const input = buildCreateInput({ ...rest, environment });
    const data = await redline.createServer(input);
    // Echo the resolved environment (secrets redacted) so the harness shows what was sent.
    return NextResponse.json({ ...data, sent: { ...input, environment: redactEnvironment(input.environment) } });
  } catch (err) {
    return redlineErrorResponse(err);
  }
}
