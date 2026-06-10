import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { createInterface } from "node:readline";

import SteamUser from "steam-user";
import GlobalOffensive from "globaloffensive";
import SteamTotp from "steam-totp";

export interface GcClientOptions {
  username: string;
  password: string;
  /** Steam Guard shared_secret for automated mobile 2FA (optional). */
  sharedSecret?: string;
  /**
   * Path to persist the Steam refresh token. After a first interactive login
   * (e.g. entering an emailed Steam Guard code), the token is reused so future
   * restarts are unattended. Omit to disable persistence.
   */
  tokenStorePath?: string;
}

/**
 * Thin wrapper around steam-user + node-globaloffensive that logs into the CS2
 * Game Coordinator and serializes requestPlayersProfile calls (single GC
 * session + Valve rate limits).
 *
 * Auth supports three modes, in priority order:
 *  1. A saved refresh token (unattended) — written after any successful login.
 *  2. shared_secret — fully automated mobile 2FA.
 *  3. Interactive Steam Guard — prompts on the terminal for an emailed/mobile
 *     code, then persists a refresh token so it's only needed once.
 */
export class GcClient {
  private user: any;
  private cs: any;
  private ready = false;
  private usedRefreshToken = false;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private opts: GcClientOptions) {
    this.user = new SteamUser();
    this.cs = new GlobalOffensive(this.user);

    this.user.on("loggedOn", () => {
      console.log("[steam] logged on; launching CS2 to reach the GC");
      this.user.gamesPlayed([730]);
    });

    this.user.on("steamGuard", (domain: string | null, callback: (code: string) => void, lastWrong: boolean) => {
      if (!domain && this.opts.sharedSecret) {
        callback(SteamTotp.generateAuthCode(this.opts.sharedSecret));
        return;
      }
      if (lastWrong) {
        console.warn("[steam] previous Steam Guard code was wrong, try again.");
      }
      const label = domain
        ? `emailed Steam Guard code (sent to your ${domain} address)`
        : "Steam Guard mobile code";
      void this.promptCode(label).then(callback);
    });

    this.user.on("refreshToken", (token: string) => {
      this.saveToken(token);
      console.log("[steam] saved refresh token — future restarts are unattended");
    });

    this.user.on("error", (e: { eresult?: number; message?: string }) => {
      if (this.usedRefreshToken) {
        console.warn(
          "[steam] saved refresh token was rejected (likely expired); clearing and re-authenticating with credentials.",
        );
        this.clearToken();
        this.usedRefreshToken = false;
        setTimeout(() => this.loginWithCredentials(), 1000);
        return;
      }
      console.error("[steam] error", e);
    });

    this.cs.on("connectedToGC", () => {
      this.ready = true;
      console.log("[gc] connected to Game Coordinator");
    });
    this.cs.on("disconnectedFromGC", (reason: unknown) => {
      this.ready = false;
      console.warn("[gc] disconnected from Game Coordinator", reason);
    });
  }

  login(): void {
    const saved = this.readToken();
    if (saved) {
      this.usedRefreshToken = true;
      console.log("[steam] logging in with saved refresh token…");
      this.user.logOn({ refreshToken: saved });
      return;
    }
    this.loginWithCredentials();
  }

  private loginWithCredentials(): void {
    this.usedRefreshToken = false;
    const logOnOptions: Record<string, unknown> = {
      accountName: this.opts.username,
      password: this.opts.password,
    };
    if (this.opts.sharedSecret) {
      logOnOptions.twoFactorCode = SteamTotp.generateAuthCode(
        this.opts.sharedSecret,
      );
    }
    this.user.logOn(logOnOptions);
  }

  private promptCode(label: string): Promise<string> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(`\nEnter ${label}: `, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  private readToken(): string | null {
    if (!this.opts.tokenStorePath) return null;
    try {
      const raw = readFileSync(this.opts.tokenStorePath, "utf8").trim();
      return raw || null;
    } catch {
      return null;
    }
  }

  private saveToken(token: string): void {
    if (!this.opts.tokenStorePath) return;
    try {
      writeFileSync(this.opts.tokenStorePath, token, { mode: 0o600 });
    } catch (e) {
      console.warn("[steam] could not persist refresh token", e);
    }
  }

  private clearToken(): void {
    if (!this.opts.tokenStorePath) return;
    try {
      rmSync(this.opts.tokenStorePath, { force: true });
    } catch {
      // best effort
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  /**
   * Request a player's GC profile (medals, coins, ranks, commendations, level).
   * Serialized behind a queue; rejects on timeout or when the GC is down.
   */
  requestProfile(steamid64: string, timeoutMs = 15000): Promise<unknown> {
    const run = () =>
      new Promise<unknown>((resolve, reject) => {
        if (!this.ready) {
          reject(new Error("gc_not_ready"));
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            reject(new Error("gc_timeout"));
          }
        }, timeoutMs);
        this.cs.requestPlayersProfile(steamid64, (profile: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(profile);
        });
      });

    const result = this.queue.then(run, run);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
