/**
 * Wallet activity watcher.
 *
 * Primary path: WebSocket logsSubscribe on the watched pubkey (works on
 * live trading RPCs like rpc edge - no transaction-history index required).
 *
 * Optional path: getSignaturesForAddress when HISTORY_RPC_URL is set to an
 * indexer/archive RPC (edge nodes often return "Transaction history is not
 * available from this node").
 */
import type { Connection, Logs } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { Connection as SolConnection } from "@solana/web3.js";
import { logPaper, paperFollowNote } from "./paper.js";
import type { AppConfig } from "./config.js";

export async function watchWallet(
  connection: Connection,
  cfg: AppConfig,
  opts: { signal?: AbortSignal } = {},
): Promise<void> {
  const pubkey = new PublicKey(cfg.watchWallet);
  const seen = new Set<string>();

  console.log(
    JSON.stringify({
      type: "watch_start",
      wallet: cfg.watchWallet,
      mode: cfg.mode,
      path: "logsSubscribe",
      note: "live WS logs on watched pubkey - paper by default",
    }),
  );

  const subId = connection.onLogs(
    pubkey,
    (logs: Logs, ctx) => {
      if (opts.signal?.aborted) return;
      if (seen.has(logs.signature)) return;
      seen.add(logs.signature);
      if (seen.size > 5_000) {
        // keep last ~1k
        const arr = [...seen];
        seen.clear();
        for (const s of arr.slice(-1000)) seen.add(s);
      }
      void handleLogs(cfg, logs, ctx.slot);
    },
    "confirmed",
  );

  // History index path: trading edge RPCs often lack address history.
  // Default paper demos use public mainnet as the index only; live WS still uses edge.
  // Set HISTORY_RPC_URL=off to disable. Override URL with HISTORY_RPC_URL=https://...
  let historyTimer: ReturnType<typeof setInterval> | undefined;
  const historyRaw = process.env.HISTORY_RPC_URL?.trim();
  const historyOff = historyRaw === "0" || historyRaw === "off" || historyRaw === "false";
  const historyUrl =
    historyOff
      ? ""
      : historyRaw && historyRaw.startsWith("http")
        ? historyRaw
        : cfg.mode === "paper"
          ? "https://api.mainnet-beta.solana.com"
          : "";

  if (historyUrl) {
    const hist = new SolConnection(historyUrl, { commitment: "confirmed" });
    console.log(
      JSON.stringify({
        type: "history_poller",
        host: (() => {
          try {
            return new URL(historyUrl).host;
          } catch {
            return "history";
          }
        })(),
        note: "address-history index (not the edge node) - seeds + new paper events",
      }),
    );
    let primed = false;
    const tick = async () => {
      try {
        const sigs = await hist.getSignaturesForAddress(pubkey, {
          limit: cfg.pollLimit,
        });
        if (!primed) {
          for (const s of sigs) seen.add(s.signature);
          primed = true;
          console.log(
            JSON.stringify({
              type: "watch_primed",
              seeded: sigs.length,
              note: "history seed complete - next polls emit new paper events only",
            }),
          );
          // In paper demos, also surface the newest historical sig once so the loop is visibly alive
          if (cfg.mode === "paper" && sigs[0]) {
            const s = sigs[0];
            logPaper({
              at: new Date().toISOString(),
              signature: s.signature,
              slot: s.slot,
              err: s.err,
              feePayer: null,
              note:
                paperFollowNote(cfg.watchWallet) +
                " (latest historical via index - seed sample)",
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
            note: paperFollowNote(cfg.watchWallet) + " (history index)",
          });
        }
      } catch (e) {
        console.error(
          JSON.stringify({
            type: "history_error",
            message: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    };
    void tick();
    historyTimer = setInterval(() => {
      void tick();
    }, cfg.pollMs);
  }

  console.log(
    JSON.stringify({
      type: "watch_listening",
      subscription: subId,
      note: "waiting for new logs involving watch wallet…",
    }),
  );

  try {
    await waitUntilAbort(opts.signal);
  } finally {
    if (historyTimer) clearInterval(historyTimer);
    try {
      await connection.removeOnLogsListener(subId);
    } catch {
      /* ignore */
    }
  }
}

async function handleLogs(
  cfg: AppConfig,
  logs: Logs,
  slot: number,
): Promise<void> {
  if (cfg.mode === "paper" || !cfg.liveSubmit) {
    logPaper({
      at: new Date().toISOString(),
      signature: logs.signature,
      slot,
      err: logs.err,
      feePayer: null,
      note:
        paperFollowNote(cfg.watchWallet) +
        (logs.err ? " (tx err on chain)" : ""),
    });
    return;
  }

  console.log(
    JSON.stringify({
      type: "live_stub",
      signature: logs.signature,
      note: "LIVE_SUBMIT enabled but auto-mirror is intentionally not implemented",
    }),
  );
}

function waitUntilAbort(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    if (!signal) {
      // never resolves without signal - keep process alive
      return;
    }
    signal.addEventListener(
      "abort",
      () => resolve(),
      { once: true },
    );
  });
}
