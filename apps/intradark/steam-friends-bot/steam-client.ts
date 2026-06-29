/**
 * Thin wrapper around steam-user for the friends bot: logs in (reusing the
 * cs2-gc-bot auth ladder — saved refresh token → shared_secret 2FA → interactive
 * Steam Guard), goes Online, auto-accepts friend requests, relays friend DMs, and
 * sends friend DMs. No Game Coordinator — this account is a social presence only.
 */

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { createInterface } from "node:readline";

import SteamUser from "steam-user";
import SteamTotp from "steam-totp";

export interface SteamClientOptions {
  username: string;
  password: string;
  sharedSecret?: string;
  tokenStorePath?: string;
  /** Non-Steam game name shown in the bot's presence, e.g. "Intradark — intradark.com". */
  gameName?: string;
}

export class SteamClient {
  private user: any;
  private ready = false;
  private usedRefreshToken = false;

  /** Set by index.ts before login(). */
  onFriendRequest?: (steamid64: string) => void | Promise<void>;
  onFriendMessage?: (steamid64: string, message: string) => void | Promise<void>;

  constructor(private opts: SteamClientOptions) {
    this.user = new SteamUser();

    this.user.on("loggedOn", () => {
      this.user.setPersona(SteamUser.EPersonaState.Online);
      this.user.gamesPlayed(this.opts.gameName ? [this.opts.gameName] : []);
      this.ready = true;
      console.log("[steam] logged on — persona Online");
    });

    this.user.on("disconnected", (eresult: unknown) => {
      this.ready = false;
      console.warn("[steam] disconnected", eresult);
    });

    this.user.on("steamGuard", (
      domain: string | null,
      callback: (code: string) => void,
      lastWrong: boolean,
    ) => {
      if (!domain && this.opts.sharedSecret) {
        callback(SteamTotp.generateAuthCode(this.opts.sharedSecret));
        return;
      }
      if (lastWrong) console.warn("[steam] previous Steam Guard code was wrong, try again.");
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
        console.warn("[steam] saved refresh token rejected; re-authenticating with credentials.");
        this.clearToken();
        this.usedRefreshToken = false;
        setTimeout(() => this.loginWithCredentials(), 1000);
        return;
      }
      console.error("[steam] error", e);
    });

    // Auto-accept incoming friend requests (relationship 2 = RequestRecipient).
    this.user.on("friendRelationship", (sid: any, relationship: number) => {
      if (relationship === SteamUser.EFriendRelationship.RequestRecipient) {
        const steamid64 = sid.getSteamID64();
        console.log(`[friends] incoming request from ${steamid64} — accepting`);
        // Small randomized delay so accepts don't look scripted.
        setTimeout(() => {
          try {
            this.user.addFriend(sid);
          } catch (e) {
            console.error("[friends] addFriend failed", e);
          }
          void this.onFriendRequest?.(steamid64);
        }, 1500 + Math.random() * 2500);
      } else if (relationship === SteamUser.EFriendRelationship.None) {
        // They removed the bot.
        void this.onFriendRequest; // no-op hook reference
      }
    });

    this.user.on("friendMessage", (sid: any, message: string) => {
      void this.onFriendMessage?.(sid.getSteamID64(), message);
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
      logOnOptions.twoFactorCode = SteamTotp.generateAuthCode(this.opts.sharedSecret);
    }
    this.user.logOn(logOnOptions);
  }

  isReady(): boolean {
    return this.ready;
  }

  /** Send a friend DM. Throws if not logged on. */
  send(steamid64: string, text: string): void {
    if (!this.ready) throw new Error("steam_not_ready");
    this.user.chatMessage(steamid64, text);
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
      return readFileSync(this.opts.tokenStorePath, "utf8").trim() || null;
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
}
