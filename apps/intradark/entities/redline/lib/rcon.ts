import "server-only";

import net from "node:net";

/**
 * Minimal Source RCON client (CS2 speaks the Valve Source RCON protocol over
 * TCP on the game port). Just enough to authenticate and run a few commands
 * (e.g. `css_plugins reload`) and return their console output. Server-only.
 */

const SERVERDATA_AUTH = 3;
const SERVERDATA_AUTH_RESPONSE = 2;
const SERVERDATA_EXECCOMMAND = 2;
const SERVERDATA_RESPONSE_VALUE = 0;

function encode(id: number, type: number, body: string): Buffer {
  const bodyBuf = Buffer.from(body, "ascii");
  const size = 10 + bodyBuf.length; // id(4) + type(4) + body + 2 null terminators
  const buf = Buffer.alloc(4 + size);
  buf.writeInt32LE(size, 0);
  buf.writeInt32LE(id, 4);
  buf.writeInt32LE(type, 8);
  bodyBuf.copy(buf, 12);
  return buf; // trailing two bytes already zero from alloc
}

type Packet = { id: number; type: number; body: string };

function parsePackets(buffer: Buffer): { packets: Packet[]; rest: Buffer } {
  const packets: Packet[] = [];
  let offset = 0;
  while (buffer.length - offset >= 4) {
    const size = buffer.readInt32LE(offset);
    if (buffer.length - offset - 4 < size) break; // incomplete packet
    const id = buffer.readInt32LE(offset + 4);
    const type = buffer.readInt32LE(offset + 8);
    const body = buffer.toString("ascii", offset + 12, offset + 4 + size - 2);
    packets.push({ id, type, body });
    offset += 4 + size;
  }
  return { packets, rest: buffer.subarray(offset) };
}

export type RconExecOptions = {
  host: string;
  port: number;
  password: string;
  commands: string[];
  connectTimeoutMs?: number;
  /** Resolve this long after the last response packet (handles quiet commands). */
  quietMs?: number;
};

/** Authenticate, run the commands in order, return their concatenated output. */
export async function rconExec(opts: RconExecOptions): Promise<string> {
  const { host, port, password, commands, connectTimeoutMs = 8000, quietMs = 1500 } = opts;
  return new Promise<string>((resolve, reject) => {
    const socket = net.connect({ host, port });
    socket.setTimeout(connectTimeoutMs);
    let buffer = Buffer.alloc(0);
    let authed = false;
    let settled = false;
    let quiet: NodeJS.Timeout | null = null;
    const outputs: string[] = [];

    const done = () => {
      if (settled) return;
      settled = true;
      if (quiet) clearTimeout(quiet);
      socket.end();
      resolve(outputs.join("").trim());
    };
    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      if (quiet) clearTimeout(quiet);
      socket.destroy();
      reject(new Error(msg));
    };
    const armQuiet = () => {
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(done, quietMs);
    };

    socket.on("connect", () => socket.write(encode(1, SERVERDATA_AUTH, password)));
    socket.on("timeout", () => fail(`RCON timeout to ${host}:${port}`));
    socket.on("error", (e) => fail(`RCON socket error: ${e.message}`));
    socket.on("close", () => done());
    socket.on("data", (chunk) => {
      socket.setTimeout(0); // got bytes — switch from connect-timeout to quiet-timer
      buffer = Buffer.concat([buffer, chunk]);
      const { packets, rest } = parsePackets(buffer);
      buffer = rest;
      for (const p of packets) {
        if (!authed) {
          if (p.type === SERVERDATA_AUTH_RESPONSE) {
            if (p.id === -1) return fail("RCON auth failed (wrong RCON password)");
            authed = true;
            commands.forEach((cmd, i) => socket.write(encode(100 + i, SERVERDATA_EXECCOMMAND, cmd)));
            armQuiet();
          }
        } else if (p.type === SERVERDATA_RESPONSE_VALUE) {
          if (p.body) outputs.push(p.body);
          armQuiet();
        }
      }
    });
  });
}
