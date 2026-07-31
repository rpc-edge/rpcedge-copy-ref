/**
 * Session counters for the paper watch loop.
 * Printed on shutdown and available to JSON mode.
 */

export type SessionStats = {
  startedAt: number;
  paper: { seed: number; history: number; live: number };
  onChain: { ok: number; failed: number };
  historyRetries: number;
  wsResubscribes: number;
};

export function createStats(): SessionStats {
  return {
    startedAt: Date.now(),
    paper: { seed: 0, history: 0, live: 0 },
    onChain: { ok: 0, failed: 0 },
    historyRetries: 0,
    wsResubscribes: 0,
  };
}

export function recordPaper(
  stats: SessionStats,
  source: "seed" | "history" | "live" | undefined,
  err: unknown,
): void {
  if (source === "seed") stats.paper.seed += 1;
  else if (source === "live") stats.paper.live += 1;
  else stats.paper.history += 1;

  if (err == null || err === false) stats.onChain.ok += 1;
  else stats.onChain.failed += 1;
}

export function totalPaper(stats: SessionStats): number {
  return stats.paper.seed + stats.paper.history + stats.paper.live;
}

export function statsSnapshot(stats: SessionStats): Record<string, unknown> {
  const elapsedSec = Math.max(0, Math.round((Date.now() - stats.startedAt) / 1000));
  return {
    elapsedSec,
    paper: { ...stats.paper, total: totalPaper(stats) },
    onChain: { ...stats.onChain },
    historyRetries: stats.historyRetries,
    wsResubscribes: stats.wsResubscribes,
  };
}
