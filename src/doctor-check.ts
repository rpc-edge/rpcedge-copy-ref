/**
 * Prove the key before the watch loop.
 * Prefer CLI when available; fall back to SDK doctor.
 */
import { loadEnvFile } from "./load-env.js";
loadEnvFile();

import { RpcEdge } from "rpcedge-sdk";
import { spawnSync } from "node:child_process";
import { printBanner } from "./banner.js";
import { DEFAULT_WATCH_WALLET } from "./config.js";

export async function runDoctor(): Promise<void> {
  // Prefer SDK when key is already in env (fast, no npx). Fall back to CLI
  // for users who only installed the global/npx CLI path.
  if (process.env.RPCEDGE_KEY?.trim()) {
    const edge = await RpcEdge.fromEnv();
    const report = await edge.doctor();
    console.log(report.summary);
    if (report.ok === false) {
      throw new Error("doctor failed - fix auth/health before watching");
    }
    return;
  }

  const viaCli = spawnSync(
    "npx",
    ["--yes", "rpcedge@latest", "doctor"],
    {
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 45_000,
    },
  );

  if (viaCli.status === 0 && viaCli.stdout?.trim()) {
    console.log(viaCli.stdout.trim());
    return;
  }

  console.log("[doctor] no RPCEDGE_KEY and CLI path unavailable - trying SDK public path");
  const edge = await RpcEdge.fromEnv();
  const report = await edge.doctor();
  console.log(report.summary);
  if (report.ok === false) {
    throw new Error("doctor failed - fix auth/health before watching");
  }
}

// CLI: pnpm doctor → tsx src/doctor-check.ts
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
