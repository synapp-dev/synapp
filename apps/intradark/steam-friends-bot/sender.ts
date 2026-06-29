/**
 * Global throttled send queue — the single biggest ban-risk lever. Every outbound
 * Steam DM funnels through here so the account never bursts: strictly sequential,
 * ~1 msg/sec with jitter. Match-pop pings get priority so they don't queue behind
 * a long news/scrim broadcast.
 */

export const PRIORITY_MATCH = 10;
export const PRIORITY_NORMAL = 0;

interface SendTask {
  steamid64: string;
  text: string;
  priority: number;
  seq: number;
  resolve: () => void;
  reject: (e: unknown) => void;
}

export interface SenderOptions {
  /** Base delay between sends (ms). */
  minDelayMs?: number;
  /** Extra random delay added per send (ms). */
  jitterMs?: number;
}

export class Sender {
  private queue: SendTask[] = [];
  private running = false;
  private seq = 0;
  private readonly minDelayMs: number;
  private readonly jitterMs: number;

  constructor(
    private readonly send: (steamid64: string, text: string) => void,
    opts: SenderOptions = {},
  ) {
    this.minDelayMs = opts.minDelayMs ?? 1000;
    this.jitterMs = opts.jitterMs ?? 500;
  }

  /** Enqueue a send; resolves once the message has actually been dispatched. */
  enqueue(steamid64: string, text: string, priority = PRIORITY_NORMAL): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ steamid64, text, priority, seq: this.seq++, resolve, reject });
      // Higher priority first; FIFO within the same priority.
      this.queue.sort((a, b) => b.priority - a.priority || a.seq - b.seq);
      void this.loop();
    });
  }

  get pending(): number {
    return this.queue.length;
  }

  private async loop(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift()!;
        try {
          this.send(task.steamid64, task.text);
          task.resolve();
        } catch (e) {
          task.reject(e);
        }
        await sleep(this.minDelayMs + Math.random() * this.jitterMs);
      }
    } finally {
      this.running = false;
    }
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
