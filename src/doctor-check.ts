/**
 * Prove the key before the watch loop.
 * Prefer SDK when keyed (fast). Fall back to CLI / public SDK path.
 * Returns RpcEdge when available so start can reuse it (one init).
 */
import { loadEnvFile } from "./load-env.js";
loadEnvFile();

import { RpcEdge } from "rpcedge-sdk";
import { spawnSync } from "node:child_process";
import { DEFAULT_WATCH_WALLET } from "./config.js";
import {
  printBanner,
  printDoctorReport,
  printWarn,
  jsonMode,
  emit,
} from "./ui.js";

/** Run doctor; return client when SDK path used so caller can skip second fromEnv. */
export async function runDoctor(): Promise<RpcEdge | undefined> {
  if (process.env.RPCEDGE_KEY?.trim()) {
    const edge = await RpcEdge.fromEnv();
    const report = await edge.doctor();
    printDoctorReport(report);
    if (!report.ok) {
      throw new Error("doctor failed - fix auth/health before watching");
    }
    return edge;
  }

  // No key: try CLI once, then public SDK baseline (do not hang on npx forever)
  const viaCli = spawnSync("npx", ["--yes", "rpcedge@latest", "doctor"], {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 45_000,
  });

  if (viaCli.status === 0 && viaCli.stdout?.trim()) {
    if (jsonMode()) {
      emit({ type: "doctor", source: "cli", summary: viaCli.stdout.trim() });
    } else {
      // CLI already pretty-prints; indent lightly under our step
      for (const line of viaCli.stdout.trim().split("\n")) {
        console.log(line.startsWith(" ") ? line : `  ${line}`);
      }
    }
    return undefined;
  }

  printWarn("no RPCEDGE_KEY - public baseline via SDK");
  const edge = await RpcEdge.fromEnv();
  const report = await edge.doctor();
  printDoctorReport(report);
  if (!report.ok) {
    throw new Error("doctor failed - fix auth/health before watching");
  }
  return edge;
}

const isMain =
  process.argv[1]?.includes("doctor-check") ||
  process.env.npm_lifecycle_event === "doctor";

if (isMain) {
  const watch = process.env.WATCH_WALLET?.trim() || DEFAULT_WATCH_WALLET;
  printBanner({
    mode: "doctor",
    hasKey: Boolean(process.env.RPCEDGE_KEY?.trim()),
    watchWallet: watch,
    usingDefaultExampleWallet: watch === DEFAULT_WATCH_WALLET,
  });
  runDoctor().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
