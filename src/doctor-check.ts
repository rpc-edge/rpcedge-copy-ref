/**
 * Prove the key before the watch loop.
 * Prefer CLI when available; fall back to SDK doctor.
 */
import { RpcEdge } from "rpcedge-sdk";
import { spawnSync } from "node:child_process";

export async function runDoctor(): Promise<void> {
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
    if (viaCli.stderr?.trim()) console.error(viaCli.stderr.trim());
    return;
  }

  // SDK path if npx path failed (offline, etc.)
  console.log("[doctor] CLI path unavailable - using rpcedge-sdk doctor");
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
  runDoctor().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
