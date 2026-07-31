/**
 * Wallet activity watcher.
 *
 * Primary: WebSocket logsSubscribe on edge (no history index required).
 * Paper helper: public mainnet getSignaturesForAddress as address index.
 * History fetches retry with backoff; optional edge getSlot heartbeat re-attach.
 */
import type { Connection, Logs, ConfirmedSignatureInfo } from "@solana/web3.js";
import { PublicKey, Connection as SolConnection } from "@solana/web3.js";
import { logPaper, paperFollowNote } from "./paper.js";
import {
  logStatus,
  printErr,
  printWarn,
  printWatchPanel,
  printWatchReady,
} from "./ui.js";
import type { AppConfig } from "./config.js";
import {
  createStats,
  recordPaper,
  statsSnapshot,
  type SessionStats,
} from "./stats.js";

const MAX_HISTORY_RETRIES = 5;

export type WatchUiMeta = {
  isDemo: boolean;
  note?: string;
  explorerUrl?: string;
};

export async function watchWallet(
  connection: Connection,
  cfg: AppConfig,
  opts: { signal?: AbortSignal; ui?: WatchUiMeta } = {},
): Promise<SessionStats> {
  const pubkey = new PublicKey(cfg.watchWallet);
  const seen = new Set<string>();
  const stats = createStats();
  const ui = opts.ui ?? { isDemo: false };

  let subId = -1;
  let wsRetries = 0;

  const attachLogs = (): number => {
    return connection.onLogs(
      pubkey,
      (logs: Logs, ctx) => {
        if (opts.signal?.aborted) return;
        if (seen.has(logs.signature)) return;
        seen.add(logs.signature);
        if (seen.size > 5_000) {
          const arr = [...seen];
          seen.clear();
          for (const s of arr.slice(-1000)) seen.add(s);
        }
        void handleLogs(cfg, logs, ctx.slot, stats);
      },
      "confirmed",
    );
  };

  try {
    subId = attachLogs();
  } catch (e) {
    printWarn(
      `logsSubscribe failed - history path only. ${e instanceof Error ? e.message : e}`,
    );
  }

  const historyRaw = process.env.HISTORY_RPC_URL?.trim();
  const historyOff =
    historyRaw === "0" || historyRaw === "off" || historyRaw === "false";
  const historyUrl = historyOff
    ? ""
    : historyRaw && historyRaw.startsWith("http")
      ? historyRaw
      : cfg.mode === "paper"
        ? "https://api.mainnet-beta.solana.com"
        : "";

  let histHost: string | null = null;
  if (historyUrl) {
    try {
      histHost = new URL(historyUrl).host;
    } catch {
      histHost = "history";
    }
  }

  // Single compact setup block (no duplicate track / feed lines)
  printWatchPanel({
    watchWallet: cfg.watchWallet,
    isDemo: ui.isDemo,
    note: ui.note,
    explorerUrl: ui.explorerUrl,
    mode: cfg.mode,
    seedSample: cfg.seedSample,
    heartbeatMs: cfg.heartbeatMs,
    liveOk: subId >= 0,
    subscription: subId >= 0 ? subId : undefined,
    historyHost: histHost,
  });

  const resubscribe = async (reason: string) => {
    if (opts.signal?.aborted) return;
    if (wsRetries >= MAX_HISTORY_RETRIES) {
      printWarn(
        `logsSubscribe re-attach capped at ${MAX_HISTORY_RETRIES} - history still active`,
      );
      return;
    }
    wsRetries += 1;
    stats.wsResubscribes += 1;
    logStatus(
      "retry",
      `ws re-attach ${wsRetries}/${MAX_HISTORY_RETRIES}  ·  ${reason}`,
      { attempt: wsRetries, reason },
    );
    try {
      if (subId >= 0) {
        try {
          await connection.removeOnLogsListener(subId);
        } catch {
          /* ignore */
        }
      }
      subId = attachLogs();
      logStatus("watch_listening", `re-attached  ·  #${subId}`);
    } catch (e) {
      printErr(e instanceof Error ? e.message : String(e));
    }
  };

  let historyTimer: ReturnType<typeof setInterval> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let primed = false;

  if (historyUrl) {
    const hist = new SolConnection(historyUrl, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 30_000,
    });

    let consecutiveFails = 0;

    const fetchSigs = async (): Promise<ConfirmedSignatureInfo[]> => {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= MAX_HISTORY_RETRIES; attempt++) {
        if (opts.signal?.aborted) return [];
        try {
          const sigs = await hist.getSignaturesForAddress(pubkey, {
            limit: cfg.pollLimit,
          });
          consecutiveFails = 0;
          return sigs;
        } catch (e) {
          lastErr = e;
          stats.historyRetries += 1;
          const delay = Math.min(8_000, 400 * 2 ** (attempt - 1));
          logStatus(
            "retry",
            `hist fetch ${attempt}/${MAX_HISTORY_RETRIES}  ·  ${delay}ms`,
            {
              attempt,
              message: e instanceof Error ? e.message : String(e),
            },
          );
          await sleep(delay, opts.signal);
        }
      }
      consecutiveFails += 1;
      printErr(
        `history index failed after ${MAX_HISTORY_RETRIES} retries: ${
          lastErr instanceof Error ? lastErr.message : String(lastErr)
        }`,
      );
      if (consecutiveFails >= 3) {
        void resubscribe("history consecutive failures");
      }
      return [];
    };

    const tick = async () => {
      const sigs = await fetchSigs();
      if (sigs.length === 0) return;

      if (!primed) {
        for (const s of sigs) seen.add(s.signature);
        primed = true;

        const seed = sigs.find((s) => s.err == null) ?? sigs[0]!;
        const failedCount = sigs.filter((s) => s.err != null).length;
        printWatchReady({
          recent: sigs.length,
          failedOnChain: failedCount,
          seedSample: cfg.seedSample,
          liveOk: subId >= 0,
        });

        if (cfg.mode === "paper" && cfg.seedSample) {
          recordPaper(stats, "seed", seed.err);
          logPaper({
            at: new Date().toISOString(),
            signature: seed.signature,
            slot: seed.slot,
            err: seed.err,
            feePayer: null,
            source: "seed",
            watchWallet: cfg.watchWallet,
            note:
              paperFollowNote(cfg.watchWallet) +
              (seed.err != null
                ? " (seed sample - this tx failed on-chain; we did not submit)"
                : " (seed sample - historical; we did not submit)"),
          });
        }
        return;
      }

      for (const s of [...sigs].reverse()) {
        if (seen.has(s.signature)) continue;
        seen.add(s.signature);
        recordPaper(stats, "history", s.err);
        logPaper({
          at: new Date().toISOString(),
          signature: s.signature,
          slot: s.slot,
          err: s.err,
          feePayer: null,
          source: "history",
          watchWallet: cfg.watchWallet,
          note: paperFollowNote(cfg.watchWallet) + " (history index)",
        });
      }
    };

    void tick();
    historyTimer = setInterval(() => {
      void tick();
    }, cfg.pollMs);
  } else {
    // No history path - ready immediately
    printWatchReady({
      recent: 0,
      failedOnChain: 0,
      seedSample: cfg.seedSample,
      liveOk: subId >= 0,
    });
    primed = true;
  }

  if (cfg.heartbeatMs > 0) {
    heartbeatTimer = setInterval(() => {
      void (async () => {
        if (opts.signal?.aborted) return;
        try {
          await connection.getSlot("processed");
        } catch (e) {
          printWarn(
            `edge heartbeat failed - ${e instanceof Error ? e.message : e}`,
          );
          await resubscribe("edge heartbeat failed");
        }
      })();
    }, cfg.heartbeatMs);
  }

  if (subId < 0 && !historyUrl) {
    printWarn("no live feed and no history index - nothing to watch");
  }

  try {
    await waitUntilAbort(opts.signal);
  } finally {
    if (historyTimer) clearInterval(historyTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (subId >= 0) {
      try {
        await connection.removeOnLogsListener(subId);
      } catch {
        /* ignore */
      }
    }
  }

  return stats;
}

async function handleLogs(
  cfg: AppConfig,
  logs: Logs,
  slot: number,
  stats: SessionStats,
): Promise<void> {
  if (cfg.mode === "paper" || !cfg.liveSubmit) {
    recordPaper(stats, "live", logs.err);
    logPaper({
      at: new Date().toISOString(),
      signature: logs.signature,
      slot,
      err: logs.err,
      feePayer: null,
      source: "live",
      watchWallet: cfg.watchWallet,
      note:
        paperFollowNote(cfg.watchWallet) +
        (logs.err ? " (live ws - tx failed on-chain; we did not submit)" : " (live ws)"),
    });
    return;
  }

  logStatus(
    "watch_listening",
    `live event ${logs.signature.slice(0, 8)}…  ·  auto-mirror not in this ref`,
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

function waitUntilAbort(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    if (!signal) return;
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

export { statsSnapshot };
