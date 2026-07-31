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

export type BannerInfo = {
  mode: string;
  hasKey: boolean;
  watchWallet: string;
  usingDefaultExampleWallet: boolean;
};

/** Full professional header. */
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

  const W = 58;
  const rule = "─".repeat(W);
  const wallet = shortAddr(info.watchWallet);
  const auth = info.hasKey
    ? paint(OK, "key set → rpc.rpcedge.com")
    : paint(WARN, "no key → public demo only");
  const watchNote = info.usingDefaultExampleWallet
    ? paint(DIM, "demo wallet · not an endorsement")
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
    `  ${paint(DIM, "watch")}     ${wallet}  ${watchNote}`,
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
  console.log(`  ${paint(DIM, "key")}       ${report.config.hasKey ? "present" : "none"}  ${paint(DIM, `(${report.config.keySource})`)}`);
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
  note?: string;
};

export function logPaper(event: PaperEvent): void {
  if (jsonMode()) {
    emit({ type: "paper", ...event });
    return;
  }

  const src =
    event.source === "live"
      ? paint(ACCENT, "live")
      : event.source === "seed"
        ? paint(DIM, "seed")
        : paint(DIM, "hist");
  const err = event.err ? paint(WARN, " err") : "";
  const slot = event.slot != null ? paint(DIM, ` slot ${event.slot}`) : "";
  console.log(
    `  ${paint(OK, "paper")}  ${src}${err}  ${shortSig(event.signature)}${slot}  ${paint(DIM, "no tx submitted")}`,
  );
}

export function logStatus(
  kind: "watch_start" | "watch_listening" | "watch_primed" | "history" | "shutdown",
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
            : "done";
  console.log(`  ${paint(DIM, label.padEnd(6))}  ${detail}`);
}

export function emit(obj: Record<string, unknown>): void {
  console.log(JSON.stringify(obj));
}
