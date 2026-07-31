/**
 * Wallet activity watcher.
 *
 * Primary: WebSocket logsSubscribe on edge (no history index required).
 * Paper helper: public mainnet getSignaturesForAddress as address index.
 * History fetches retry with backoff on transient errors.
 */
import type { Connection, Logs, ConfirmedSignatureInfo } from "@solana/web3.js";
import { PublicKey, Connection as SolConnection } from "@solana/web3.js";
import { logPaper, paperFollowNote } from "./paper.js";
import { logStatus, printErr, printWarn, shortAddr } from "./ui.js";
import type { AppConfig } from "./config.js";

const MAX_HISTORY_RETRIES = 5;

export async function watchWallet(
  connection: Connection,
  cfg: AppConfig,
  opts: { signal?: AbortSignal } = {},
): Promise<void> {
  const pubkey = new PublicKey(cfg.watchWallet);
  const seen = new Set<string>();

  logStatus(
    "watch_start",
    `tracking ${shortAddr(cfg.watchWallet)}  ·  logsSubscribe  ·  mode ${cfg.mode}`,
    { wallet: cfg.watchWallet, mode: cfg.mode, path: "logsSubscribe" },
  );
  logStatus("watch_start", cfg.watchWallet, { wallet: cfg.watchWallet });

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
        void handleLogs(cfg, logs, ctx.slot);
      },
      "confirmed",
    );
  };

  try {
    subId = attachLogs();
  } catch (e) {
    printWarn(
      `logsSubscribe failed once - will keep history path. ${e instanceof Error ? e.message : e}`,
    );
  }

  // Resubscribe helper if connection drops (web3 may surface via errors later)
  const resubscribe = async () => {
    if (opts.signal?.aborted) return;
    if (wsRetries >= MAX_HISTORY_RETRIES) return;
    wsRetries += 1;
    logStatus(
      "retry",
      `logsSubscribe re-attach attempt ${wsRetries}/${MAX_HISTORY_RETRIES}`,
      { attempt: wsRetries },
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
      logStatus("watch_listening", `subscription #${subId}  ·  re-attached`);
    } catch (e) {
      printErr(e instanceof Error ? e.message : String(e));
    }
  };

  let historyTimer: ReturnType<typeof setInterval> | undefined;
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

  if (historyUrl) {
    const hist = new SolConnection(historyUrl, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 30_000,
    });
    let histHost = "history";
    try {
      histHost = new URL(historyUrl).host;
    } catch {
      /* keep */
    }
    logStatus(
      "history",
      `address index ${histHost}  ·  edge has no full history API`,
      { host: histHost },
    );

    let primed = false;
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
          const delay = Math.min(8_000, 400 * 2 ** (attempt - 1));
          logStatus(
            "retry",
            `history fetch failed (${attempt}/${MAX_HISTORY_RETRIES})  ·  retry in ${delay}ms`,
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
        void resubscribe();
      }
      return [];
    };

    const tick = async () => {
      const sigs = await fetchSigs();
      if (sigs.length === 0) return;

      if (!primed) {
        for (const s of sigs) seen.add(s.signature);
        primed = true;

        // Prefer a successful on-chain tx for the seed sample when available
        const seed =
          sigs.find((s) => s.err == null) ?? sigs[0]!;

        const failedCount = sigs.filter((s) => s.err != null).length;
        logStatus(
          "watch_primed",
          `seeded ${sigs.length} recent  ·  ${failedCount} failed on-chain in batch  ·  showing 1 sample`,
          { seeded: sigs.length, failedInBatch: failedCount },
        );

        if (cfg.mode === "paper") {
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
  }

  if (subId >= 0) {
    logStatus(
      "watch_listening",
      `subscription #${subId}  ·  waiting for new activity on track wallet  ·  Ctrl+C to stop`,
      { subscription: subId, wallet: cfg.watchWallet },
    );
  } else {
    printWarn("no live logsSubscribe - paper path relies on history index only");
  }

  try {
    await waitUntilAbort(opts.signal);
  } finally {
    if (historyTimer) clearInterval(historyTimer);
    if (subId >= 0) {
      try {
        await connection.removeOnLogsListener(subId);
      } catch {
        /* ignore */
      }
    }
  }
}

async function handleLogs(cfg: AppConfig, logs: Logs, slot: number): Promise<void> {
  if (cfg.mode === "paper" || !cfg.liveSubmit) {
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
    `live stub ${logs.signature.slice(0, 8)}…  ·  auto-mirror not implemented`,
  );
}

/** Resolve after ms, or immediately if aborted (no throw - used inside poll loops). */
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
