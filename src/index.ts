/**
 * rpcedge-copy-ref - copy-watch reference for rpc edge.
 *
 * 1) doctor (prove key)
 * 2) watch WATCH_WALLET signatures via RPC
 * 3) paper-log only unless you deliberately go live (still no auto-mirror)
 */
import { loadEnvFile } from "./load-env.js";
loadEnvFile();

import { RpcEdge } from "rpcedge-sdk";
import { loadConfig, DEFAULT_WATCH_WALLET } from "./config.js";
import { runDoctor } from "./doctor-check.js";
import { watchWallet } from "./watch.js";

async function main(): Promise<void> {
  const cfg = loadConfig();

  console.log(
    JSON.stringify({
      type: "boot",
      project: "rpcedge-copy-ref",
      version: "0.1.0",
      watchWallet: cfg.watchWallet,
      usingDefaultExampleWallet: cfg.watchWallet === DEFAULT_WATCH_WALLET,
      mode: cfg.mode,
      hasKey: cfg.hasKey,
      disclaimer:
        "Not financial advice. Default wallet is a high-activity public example for stream demos only - not an endorsement. Paper mode default.",
    }),
  );

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
    console.warn(
      JSON.stringify({
        type: "warn",
        message:
          "RPCEDGE_KEY unset - paper demo on public RPC only. Production path: app.rpcedge.com/signup + doctor.",
      }),
    );
  }

  console.log("[1/2] doctor");
  await runDoctor();

  console.log("[2/2] watch");
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
      console.log(JSON.stringify({ type: "shutdown", ok: true }));
      return;
    }
    throw e;
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
