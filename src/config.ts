/**
 * Runtime config for the copy-watch reference.
 * Secrets only from env - never commit .env.
 */

/** High-activity example wallet for demos only - not an endorsement (see README). */
export const DEFAULT_WATCH_WALLET = "bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa";

export type RunMode = "paper" | "live";

export type AppConfig = {
  watchWallet: string;
  mode: RunMode;
  liveSubmit: boolean;
  pollMs: number;
  pollLimit: number;
  hasKey: boolean;
  /** Emit one historical seed sample after history prime (default true). */
  seedSample: boolean;
  /** Edge WS health probe interval; 0 disables. */
  heartbeatMs: number;
};

export function loadConfig(): AppConfig {
  const watchWallet = (
    process.env.WATCH_WALLET?.trim() ||
    DEFAULT_WATCH_WALLET
  ).trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(watchWallet)) {
    throw new Error(
      `WATCH_WALLET looks invalid (expected base58 pubkey). got length=${watchWallet.length}`,
    );
  }

  const modeRaw = (process.env.MODE ?? "paper").trim().toLowerCase();
  const mode: RunMode = modeRaw === "live" ? "live" : "paper";
  const liveSubmit = process.env.LIVE_SUBMIT === "1" || process.env.LIVE_SUBMIT === "true";
  const pollMs = clampInt(process.env.POLL_MS, 2000, 500, 60_000);
  const pollLimit = clampInt(process.env.POLL_LIMIT, 15, 1, 50);
  const hasKey = Boolean(process.env.RPCEDGE_KEY?.trim());
  const seedSample = parseBool(process.env.SEED_SAMPLE, true);
  const heartbeatMs = clampInt(process.env.HEARTBEAT_MS, 30_000, 0, 300_000);

  if (mode === "live" && !liveSubmit) {
    console.warn(
      "[config] MODE=live but LIVE_SUBMIT is not 1 - staying paper-safe (log only).",
    );
  }

  return {
    watchWallet,
    mode: mode === "live" && liveSubmit ? "live" : "paper",
    liveSubmit: mode === "live" && liveSubmit,
    pollMs,
    pollLimit,
    hasKey,
    seedSample,
    heartbeatMs,
  };
}

/** true unless set to 0 / false / off / no. Default when unset. */
function parseBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw == null || raw.trim() === "") return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  return defaultValue;
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
