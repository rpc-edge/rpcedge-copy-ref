/**
 * Wallet activity watcher.
 *
 * Primary: WebSocket logsSubscribe on edge (no history index required).
 * Paper helper: public mainnet getSignaturesForAddress as address index.
 */
import type { Connection, Logs } from "@solana/web3.js";
import { PublicKey, Connection as SolConnection } from "@solana/web3.js";
import { logPaper, paperFollowNote } from "./paper.js";
import { logStatus, printErr, shortAddr } from "./ui.js";
import type { AppConfig } from "./config.js";

export async function watchWallet(
  connection: Connection,
  cfg: AppConfig,
  opts: { signal?: AbortSignal } = {},
): Promise<void> {
  const pubkey = new PublicKey(cfg.watchWallet);
  const seen = new Set<string>();

  logStatus(
    "watch_start",
    `logsSubscribe on ${shortAddr(cfg.watchWallet)}  ·  mode ${cfg.mode}`,
    { wallet: cfg.watchWallet, mode: cfg.mode, path: "logsSubscribe" },
  );

  const subId = connection.onLogs(
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
    const hist = new SolConnection(historyUrl, { commitment: "confirmed" });
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
    const tick = async () => {
      try {
        const sigs = await hist.getSignaturesForAddress(pubkey, {
          limit: cfg.pollLimit,
        });
        if (!primed) {
          for (const s of sigs) seen.add(s.signature);
          primed = true;
          logStatus(
            "watch_primed",
            `seeded ${sigs.length} recent signatures  ·  emitting seed sample`,
            { seeded: sigs.length },
          );
          if (cfg.mode === "paper" && sigs[0]) {
            const s = sigs[0];
            logPaper({
              at: new Date().toISOString(),
              signature: s.signature,
              slot: s.slot,
              err: s.err,
              feePayer: null,
              source: "seed",
              note: paperFollowNote(cfg.watchWallet) + " (seed sample)",
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
            note: paperFollowNote(cfg.watchWallet) + " (history index)",
          });
        }
      } catch (e) {
        printErr(e instanceof Error ? e.message : String(e));
      }
    };
    void tick();
    historyTimer = setInterval(() => {
      void tick();
    }, cfg.pollMs);
  }

  logStatus(
    "watch_listening",
    `subscription #${subId}  ·  waiting for new activity  ·  Ctrl+C to stop`,
    { subscription: subId },
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

async function handleLogs(cfg: AppConfig, logs: Logs, slot: number): Promise<void> {
  if (cfg.mode === "paper" || !cfg.liveSubmit) {
    logPaper({
      at: new Date().toISOString(),
      signature: logs.signature,
      slot,
      err: logs.err,
      feePayer: null,
      source: "live",
      note:
        paperFollowNote(cfg.watchWallet) +
        (logs.err ? " (tx err on chain)" : ""),
    });
    return;
  }

  logStatus(
    "watch_listening",
    `live stub ${logs.signature.slice(0, 8)}…  ·  auto-mirror not implemented`,
  );
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
