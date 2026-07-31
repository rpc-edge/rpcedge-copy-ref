/**
 * Wallet activity watcher via RPC signature polling.
 * Uses rpcedge-sdk Connection (HTTP + WS endpoints from RPCEDGE_KEY).
 *
 * This is the reference path: simple, honest, works without a long-lived gRPC
 * stream. Production bots usually narrow Yellowstone filters - see README.
 */
import type { Connection, ConfirmedSignatureInfo } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { logPaper, paperFollowNote } from "./paper.js";
import type { AppConfig } from "./config.js";

export async function watchWallet(
  connection: Connection,
  cfg: AppConfig,
  opts: { signal?: AbortSignal } = {},
): Promise<void> {
  const pubkey = new PublicKey(cfg.watchWallet);
  const seen = new Set<string>();
  let primed = false;

  console.log(
    JSON.stringify({
      type: "watch_start",
      wallet: cfg.watchWallet,
      mode: cfg.mode,
      pollMs: cfg.pollMs,
      note: "polling getSignaturesForAddress - paper by default",
    }),
  );

  while (!opts.signal?.aborted) {
    try {
      // Newest first. First poll only seeds `seen` so we don't replay history.
      const sigs = await connection.getSignaturesForAddress(pubkey, {
        limit: cfg.pollLimit,
      });

      if (!primed) {
        for (const s of sigs) seen.add(s.signature);
        primed = true;
        console.log(
          JSON.stringify({
            type: "watch_primed",
            seeded: sigs.length,
            note: "historical signatures marked seen; logging only new ones next",
          }),
        );
      } else {
        // Process oldest-of-batch first for roughly chronological paper logs.
        for (const s of [...sigs].reverse()) {
          if (seen.has(s.signature)) continue;
          seen.add(s.signature);
          await handleSignature(connection, cfg, s);
        }
        // Bound memory on long runs
        if (seen.size > 5_000) {
          const keep = sigs.map((s) => s.signature);
          seen.clear();
          for (const k of keep) seen.add(k);
        }
      }
    } catch (e) {
      console.error(
        JSON.stringify({
          type: "watch_error",
          message: e instanceof Error ? e.message : String(e),
        }),
      );
    }

    await sleep(cfg.pollMs, opts.signal);
  }
}

async function handleSignature(
  connection: Connection,
  cfg: AppConfig,
  info: ConfirmedSignatureInfo,
): Promise<void> {
  let feePayer: string | null = null;
  try {
    const tx = await connection.getTransaction(info.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    const keys = tx?.transaction.message.getAccountKeys();
    feePayer = keys?.get(0)?.toBase58() ?? null;
  } catch {
    // still paper-log the signature
  }

  if (cfg.mode === "paper" || !cfg.liveSubmit) {
    logPaper({
      at: new Date().toISOString(),
      signature: info.signature,
      slot: info.slot,
      err: info.err,
      feePayer,
      note: paperFollowNote(cfg.watchWallet),
    });
    return;
  }

  // Live path deliberately minimal: this reference does not auto-mirror trades.
  // Wire your own signed payload + edge.sendSignedTransaction if you know what you are doing.
  console.log(
    JSON.stringify({
      type: "live_stub",
      signature: info.signature,
      note: "LIVE_SUBMIT enabled but auto-mirror is intentionally not implemented - build your own risk stack",
    }),
  );
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}
