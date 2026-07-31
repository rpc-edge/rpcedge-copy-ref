/**
 * Terminal UI: professional header + pretty operator lines.
 * Set LOG_JSON=1 for machine-readable JSON events only.
 */

export const VERSION = "0.1.0";

const ACCENT = "\x1b[38;2;197;242;63m";
const DIM = "\x1b[90m";
const HI = "\x1b[97m";
const OK = "\x1b[38;2;120;220;140m";
const WARN = "\x1b[38;2;240;180;80m";
const ERR = "\x1b[38;2;240;100;100m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export function jsonMode(): boolean {
  const v = process.env.LOG_JSON?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || process.argv.includes("--json");
}

function useColor(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR === "0") return false;
  if (process.env.FORCE_COLOR) return true;
  return Boolean(process.stdout.isTTY);
}

function paint(code: string, s: string): string {
  return useColor() ? `${code}${s}${RESET}` : s;
}

export function shortAddr(pk: string, head = 4, tail = 4): string {
  if (pk.length < head + tail + 1) return pk;
  return `${pk.slice(0, head)}…${pk.slice(-tail)}`;
}

export function shortSig(sig: string): string {
  if (sig.length < 16) return sig;
  return `${sig.slice(0, 8)}…${sig.slice(-8)}`;
}

/** Human label for on-chain tx result (not our submit result). */
export function onChainStatus(err: unknown): { ok: boolean; label: string } {
  if (err == null || err === false) return { ok: true, label: "on-chain ok" };
  if (typeof err === "string") return { ok: false, label: `on-chain failed: ${err}` };
  try {
    const s = JSON.stringify(err);
    if (s.includes("InstructionError")) {
      return { ok: false, label: "on-chain failed (instruction error)" };
    }
    return { ok: false, label: `on-chain failed (${s.slice(0, 80)})` };
  } catch {
    return { ok: false, label: "on-chain failed" };
  }
}

export type BannerInfo = {
  mode: string;
  hasKey: boolean;
  watchWallet: string;
  usingDefaultExampleWallet: boolean;
};

/** Full professional header - always shows full track wallet. */
export function printBanner(info: BannerInfo): void {
  if (jsonMode()) {
    emit({
      type: "boot",
      project: "rpcedge-copy-ref",
      version: VERSION,
      ...info,
    });
    return;
  }

  const W = 62;
  const rule = "─".repeat(W);
  const auth = info.hasKey
    ? paint(OK, "key set → rpc.rpcedge.com")
    : paint(WARN, "no key → public demo only");
  const trackNote = info.usingDefaultExampleWallet
    ? paint(DIM, "default demo · not an endorsement · NFA")
    : paint(DIM, "custom WATCH_WALLET");

  const lines = [
    "",
    paint(DIM, rule),
    `  ${paint(ACCENT, "›››")}  ${paint(BOLD + HI, "rpc edge")}${paint(DIM, "  ·  ")}${paint(HI, "copy-ref")}`,
    `       ${paint(DIM, "paper copy-watch  ·  not a strategy  ·  MIT")}`,
    paint(DIM, rule),
    `  ${paint(DIM, "version")}   ${VERSION}`,
    `  ${paint(DIM, "mode")}      ${info.mode}`,
    `  ${paint(DIM, "auth")}      ${auth}`,
    `  ${paint(DIM, "track")}     ${paint(HI, info.watchWallet)}`,
    `  ${paint(DIM, "         ")} ${trackNote}`,
    `  ${paint(DIM, "docs")}      https://rpcedge.com/toolkit`,
    `  ${paint(DIM, "signup")}    https://app.rpcedge.com/signup`,
    paint(DIM, rule),
    "",
  ];
  console.log(lines.join("\n"));
}

export function printStep(n: number, total: number, label: string): void {
  if (jsonMode()) {
    emit({ type: "step", n, total, label });
    return;
  }
  console.log(`${paint(ACCENT, `[${n}/${total}]`)} ${paint(BOLD + HI, label)}`);
}

/** Fixed-width dim label so watch/doctor rows align. */
function row(label: string, value: string): void {
  console.log(`  ${paint(DIM, label.padEnd(8))} ${value}`);
}

export type WatchPanelInfo = {
  watchWallet: string;
  isDemo: boolean;
  /** Short operator note under track (demo context, NFA). */
  note?: string;
  explorerUrl?: string;
  mode: string;
  seedSample: boolean;
  heartbeatMs: number;
  /** Edge logsSubscribe attached. */
  liveOk: boolean;
  subscription?: number;
  /** Host for history index, or null if off. */
  historyHost?: string | null;
};

/**
 * One compact watch block - full wallet once, no duplicate track lines.
 */
export function printWatchPanel(info: WatchPanelInfo): void {
  if (jsonMode()) {
    emit({ type: "watch_setup", ...info });
    return;
  }

  row("track", paint(HI, info.watchWallet));
  if (info.note) {
    row("note", paint(DIM, info.note));
  }
  if (info.explorerUrl) {
    row("link", paint(DIM, info.explorerUrl));
  }

  const livePart = info.liveOk
    ? paint(OK, `logsSubscribe #${info.subscription ?? 0}`)
    : paint(WARN, "logsSubscribe offline");
  row("live", `${livePart}  ${paint(DIM, "edge ws")}`);

  if (info.historyHost) {
    row("hist", `${paint(HI, info.historyHost)}  ${paint(DIM, "address index · not on edge")}`);
  } else {
    row("hist", paint(DIM, "off"));
  }

  const opts: string[] = [
    `mode ${info.mode}`,
    info.seedSample ? "seed on" : "seed off",
  ];
  if (info.heartbeatMs > 0) {
    opts.push(`hb ${Math.round(info.heartbeatMs / 1000)}s`);
  } else {
    opts.push("hb off");
  }
  row("opts", paint(DIM, opts.join("  ·  ")));
}

export type WatchPrimedInfo = {
  recent: number;
  failedOnChain: number;
  seedSample: boolean;
  liveOk: boolean;
};

/** After history prime (or immediately if no history). */
export function printWatchReady(info: WatchPrimedInfo): void {
  if (jsonMode()) {
    emit({ type: "watch_ready", ...info });
    return;
  }
  // "failed" = track-wallet txs that already failed on Solana (not our paper path).
  const okCount = Math.max(0, info.recent - info.failedOnChain);
  const batch =
    info.recent > 0
      ? info.failedOnChain > 0
        ? `batch ${info.recent}  ·  ${okCount} ok / ${info.failedOnChain} err on-chain (wallet txs)`
        : `batch ${info.recent}  ·  all on-chain ok (wallet txs)`
      : "no history batch";
  const parts = [batch];
  if (!info.seedSample) parts.push("seed off");
  if (info.liveOk) parts.push("listening");
  else parts.push("history-only");
  parts.push("Ctrl+C stop");
  row("ready", paint(OK, parts.join("  ·  ")));
}

export function printOk(msg: string): void {
  if (jsonMode()) {
    emit({ type: "ok", message: msg });
    return;
  }
  console.log(`  ${paint(OK, "✓")}  ${msg}`);
}

export function printInfo(msg: string): void {
  if (jsonMode()) {
    emit({ type: "info", message: msg });
    return;
  }
  console.log(`  ${paint(DIM, "·")}  ${msg}`);
}

export function printWarn(msg: string): void {
  if (jsonMode()) {
    emit({ type: "warn", message: msg });
    return;
  }
  console.warn(`  ${paint(WARN, "!")}  ${msg}`);
}

export function printErr(msg: string): void {
  if (jsonMode()) {
    emit({ type: "error", message: msg });
    return;
  }
  console.error(`  ${paint(ERR, "✗")}  ${msg}`);
}

export function printDoctorReport(report: {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
  config: {
    label: string;
    keySource: string;
    rpcUrlRedacted: string;
    grpcHost: string;
    relayBase: string;
    hasKey: boolean;
  };
}): void {
  if (jsonMode()) {
    emit({ type: "doctor", ok: report.ok, config: report.config, checks: report.checks });
    return;
  }

  const status = report.ok ? paint(OK, "OK") : paint(ERR, "FAIL");
  console.log(`  ${paint(DIM, "status")}    ${status}`);
  console.log(`  ${paint(DIM, "endpoint")}  ${report.config.label}`);
  console.log(`  ${paint(DIM, "rpc")}       ${report.config.rpcUrlRedacted}`);
  console.log(`  ${paint(DIM, "grpc")}      ${report.config.grpcHost}`);
  console.log(`  ${paint(DIM, "relay")}     ${report.config.relayBase}`);
  console.log(
    `  ${paint(DIM, "key")}       ${report.config.hasKey ? "present" : "none"}  ${paint(DIM, `(${report.config.keySource})`)}`,
  );
  for (const ch of report.checks) {
    const mark = ch.ok ? paint(OK, "ok") : paint(ERR, "fail");
    console.log(`  ${paint(DIM, "check")}     ${mark}  ${ch.name}  ${paint(DIM, ch.detail)}`);
  }
  if (report.ok) {
    console.log(`  ${paint(OK, "ready")}     doctor green - continue to watch`);
  }
}

export type PaperEvent = {
  at: string;
  signature: string;
  slot?: number | null;
  err?: unknown;
  feePayer?: string | null;
  source?: "live" | "history" | "seed";
  watchWallet?: string;
  note?: string;
};

export function logPaper(event: PaperEvent): void {
  if (jsonMode()) {
    emit({ type: "paper", ...event });
    return;
  }

  const sourceLabel =
    event.source === "live"
      ? "live ws"
      : event.source === "seed"
        ? "seed sample"
        : "history index";

  const chain = onChainStatus(event.err);
  const chainPaint = chain.ok ? paint(OK, chain.label) : paint(WARN, chain.label);
  const wallet = event.watchWallet
    ? paint(DIM, `track ${shortAddr(event.watchWallet)}`)
    : "";
  const slot = event.slot != null ? paint(DIM, `slot ${event.slot}`) : "";

  // Two-line paper event (full track wallet is printed once at watch start)
  console.log(
    `  ${paint(OK, "paper")}  ${paint(DIM, sourceLabel)}  ·  ${chainPaint}  ·  ${paint(DIM, "no submit")}`,
  );
  console.log(
    `         ${paint(HI, shortSig(event.signature))}  ${slot}${wallet ? `  ${wallet}` : ""}`,
  );
}

export function logStatus(
  kind:
    | "watch_start"
    | "watch_listening"
    | "watch_primed"
    | "history"
    | "shutdown"
    | "retry"
    | "stats",
  detail: string,
  extra?: Record<string, unknown>,
): void {
  if (jsonMode()) {
    emit({ type: kind, message: detail, ...extra });
    return;
  }
  const label =
    kind === "watch_start"
      ? "watch"
      : kind === "watch_listening"
        ? "live"
        : kind === "watch_primed"
          ? "index"
          : kind === "history"
            ? "index"
            : kind === "retry"
              ? "retry"
              : kind === "stats"
                ? "stats"
                : "done";
  console.log(`  ${paint(DIM, label.padEnd(6))}  ${detail}`);
}

/** End-of-session summary (pretty or JSON). */
export function printSessionSummary(snapshot: Record<string, unknown>): void {
  if (jsonMode()) {
    emit({ type: "session_summary", ...snapshot });
    return;
  }
  const paper = snapshot.paper as { total?: number; seed?: number; history?: number; live?: number };
  const onChain = snapshot.onChain as { ok?: number; failed?: number };
  const elapsed = snapshot.elapsedSec ?? "?";
  console.log("");
  logStatus(
    "stats",
    `session ${elapsed}s  ·  paper ${paper?.total ?? 0}  (seed ${paper?.seed ?? 0} · hist ${paper?.history ?? 0} · live ${paper?.live ?? 0})`,
  );
  logStatus(
    "stats",
    `on-chain seen  ok ${onChain?.ok ?? 0}  ·  failed ${onChain?.failed ?? 0}  ·  no submit`,
  );
  if ((snapshot.historyRetries as number) > 0 || (snapshot.wsResubscribes as number) > 0) {
    logStatus(
      "stats",
      `retries  history ${snapshot.historyRetries ?? 0}  ·  ws re-attach ${snapshot.wsResubscribes ?? 0}`,
    );
  }
  logStatus("shutdown", "stopped  ·  paper only - nothing was submitted");
}

export function emit(obj: Record<string, unknown>): void {
  console.log(JSON.stringify(obj));
}
