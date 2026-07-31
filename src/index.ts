/**
 * rpcedge-copy-ref - copy-watch reference for rpc edge.
 *
 * 1) doctor (prove key)
 * 2) watch WATCH_WALLET via logsSubscribe
 * 3) paper-log only unless you deliberately go live (still no auto-mirror)
 */
import { loadEnvFile } from "./load-env.js";
loadEnvFile();

import { RpcEdge } from "rpcedge-sdk";
import { loadConfig, DEFAULT_WATCH_WALLET } from "./config.js";
import { runDoctor } from "./doctor-check.js";
import { watchWallet } from "./watch.js";
import {
  printBanner,
  printStep,
  printWarn,
  logStatus,
  jsonMode,
  emit,
  VERSION,
} from "./ui.js";

async function main(): Promise<void> {
  const cfg = loadConfig();

  printBanner({
    mode: cfg.mode,
    hasKey: cfg.hasKey,
    watchWallet: cfg.watchWallet,
    usingDefaultExampleWallet: cfg.watchWallet === DEFAULT_WATCH_WALLET,
  });

  // Extra machine boot only when not already emitted via banner JSON mode
  if (!jsonMode()) {
    // keep a single optional JSON line disabled in pretty mode
  } else {
    emit({
      type: "boot",
      project: "rpcedge-copy-ref",
      version: VERSION,
      watchWallet: cfg.watchWallet,
      usingDefaultExampleWallet: cfg.watchWallet === DEFAULT_WATCH_WALLET,
      mode: cfg.mode,
      hasKey: cfg.hasKey,
    });
  }

  if (!cfg.hasKey) {
    if (cfg.mode !== "paper") {
      console.error(
        [
          "",
          "RPCEDGE_KEY is required for non-paper runs.",
          "  1. Sign up: https://app.rpcedge.com/signup",
          "  2. export RPCEDGE_KEY=your-uuid-key",
          "  3. pnpm doctor && pnpm start",
          "",
        ].join("\n"),
      );
      process.exit(1);
    }
    printWarn("RPCEDGE_KEY unset - paper demo may use public RPC only");
  }

  printStep(1, 2, "doctor");
  await runDoctor();
  console.log("");

  printStep(2, 2, "watch");
  if (!jsonMode()) {
    console.log(`  track   ${cfg.watchWallet}`);
    if (cfg.watchWallet === DEFAULT_WATCH_WALLET) {
      printWarn("demo track wallet - override with WATCH_WALLET for real work");
    }
  }
  const edge = await RpcEdge.fromEnv();
  const connection = await edge.connection({ commitment: "confirmed" });

  const ac = new AbortController();
  const stop = () => ac.abort();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  try {
    await watchWallet(connection, cfg, { signal: ac.signal });
  } catch (e) {
    if (e instanceof Error && e.message === "aborted") {
      logStatus("shutdown", "stopped");
      return;
    }
    throw e;
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
