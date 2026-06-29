/**
 * Pure round-robin scheduling (circle method). No DB imports so it's safely
 * unit-testable in isolation. Used by the league driver's generateSchedule.
 */

export interface Pairing {
  round: number;
  home: string;
  away: string;
}

/** Circle-method pairings over entrant ids. Odd fields get a bye each round. */
export function roundRobinPairings(ids: string[], double: boolean): Pairing[] {
  const arr: (string | null)[] = [...ids];
  if (arr.length % 2 === 1) arr.push(null); // bye marker
  const n = arr.length;
  const rounds = n - 1;
  const half = n / 2;
  const out: Pairing[] = [];

  const rot = [...arr];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      if (a != null && b != null) {
        const home = r % 2 === 0 ? a : b;
        const away = r % 2 === 0 ? b : a;
        out.push({ round: r + 1, home, away });
      }
    }
    // rotate everything except the first element
    const rest = rot.slice(1);
    rest.unshift(rest.pop() as string | null);
    for (let i = 1; i < n; i++) rot[i] = rest[i - 1]!;
  }

  if (double) {
    const second = out.map((m) => ({
      round: m.round + rounds,
      home: m.away,
      away: m.home,
    }));
    return [...out, ...second];
  }
  return out;
}
