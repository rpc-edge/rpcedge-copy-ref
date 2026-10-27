/**
 * Prove the key before the watch loop.
 * Keyed or not, the check runs in-process through the SDK (no child process,
 * no runtime package fetch). Without a key it uses the public baseline.
 * Returns RpcEdge so start can reuse it (one init).
 */
import { loadEnvFile } from "./load-env.js";
loadEnvFile();

import { RpcEdge } from "rpcedge-sdk";
import { DEFAULT_WATCH_WALLET } from "./config.js";
import {
  printBanner,
  printDoctorReport,
  printWarn,
} from "./ui.js";

/** Run doctor; return the client so the caller can skip a second fromEnv. */
export async function runDoctor(): Promise<RpcEdge> {
  if (process.env.RPCEDGE_KEY?.trim()) {
    const edge = await RpcEdge.fromEnv();
    const report = await edge.doctor();
    printDoctorReport(report);
    if (!report.ok) {
      throw new Error("doctor failed - fix auth/health before watching");
    }
    return edge;
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
