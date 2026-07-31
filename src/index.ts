#!/usr/bin/env node
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
import { watchWallet, statsSnapshot } from "./watch.js";
import { DEFAULT_WALLET_CONTEXT } from "./wallet-context.js";
import {
  printBanner,
  printStep,
  printWarn,
  printSessionSummary,
} from "./ui.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  const isDemo = cfg.watchWallet === DEFAULT_WATCH_WALLET;

  printBanner({
    mode: cfg.mode,
    hasKey: cfg.hasKey,
    watchWallet: cfg.watchWallet,
    usingDefaultExampleWallet: isDemo,
  });

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
  // Reuse client from doctor (avoids second fromEnv + slower start)
  const edge = (await runDoctor()) ?? (await RpcEdge.fromEnv());
  console.log("");

  printStep(2, 2, "watch");
  const connection = await edge.connection({ commitment: "confirmed" });

  const ac = new AbortController();
  const stop = () => ac.abort();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  const stats = await watchWallet(connection, cfg, {
    signal: ac.signal,
    ui: isDemo
      ? {
          isDemo: true,
          note: `demo · high-activity deploy wallet · ${DEFAULT_WALLET_CONTEXT.sentiment} · NFA · set WATCH_WALLET to override`,
          explorerUrl: DEFAULT_WALLET_CONTEXT.explorer,
        }
      : {
          isDemo: false,
          note: "custom WATCH_WALLET · paper only · no auto-submit",
        },
  });
  printSessionSummary(statsSnapshot(stats));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
