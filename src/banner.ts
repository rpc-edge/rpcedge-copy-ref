/**
 * Terminal header for operator-facing CLI output.
 * No color deps; ANSI only when stdout is a TTY.
 */

export const VERSION = "0.1.0";

const ACCENT = "\x1b[38;2;197;242;63m"; // acid-lime #C5F23F
const DIM = "\x1b[90m";
const HI = "\x1b[97m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function c(code: string, s: string, color: boolean): string {
  return color ? `${code}${s}${RESET}` : s;
}

export type BannerInfo = {
  mode: string;
  hasKey: boolean;
  watchWallet: string;
  usingDefaultExampleWallet: boolean;
};

/** Multi-line professional header printed before doctor / watch. */
export function printBanner(info?: Partial<BannerInfo>): void {
  const color = Boolean(process.stdout.isTTY);
  const line = "─".repeat(56);

  const title = c(BOLD + HI, "rpc edge", color) + " " + c(DIM, "·", color) + " " + c(HI, "copy-ref", color);
  const tag = c(DIM, "paper copy-watch reference  ·  not a strategy  ·  MIT", color);

  const rows: string[] = [
    "",
    c(DIM, line, color),
    `  ${c(ACCENT, "›››", color)}  ${title}`,
    `       ${tag}`,
    c(DIM, line, color),
  ];

  if (info) {
    const wallet =
      info.watchWallet && info.watchWallet.length > 12
        ? `${info.watchWallet.slice(0, 4)}…${info.watchWallet.slice(-4)}`
        : (info.watchWallet ?? "—");
    const mode = info.mode ?? "paper";
    const key = info.hasKey ? c(ACCENT, "RPCEDGE_KEY set", color) : c(DIM, "no key (public demo)", color);
    const demo = info.usingDefaultExampleWallet
      ? c(DIM, "default demo wallet (not an endorsement)", color)
      : c(DIM, "custom WATCH_WALLET", color);

    rows.push(
      `  ${c(DIM, "version", color)}  ${VERSION}`,
      `  ${c(DIM, "mode   ", color)}  ${mode}`,
      `  ${c(DIM, "auth   ", color)}  ${key}`,
      `  ${c(DIM, "watch  ", color)}  ${wallet}  ${demo}`,
      `  ${c(DIM, "docs   ", color)}  https://rpcedge.com/toolkit`,
      `  ${c(DIM, "signup ", color)}  https://app.rpcedge.com/signup`,
      c(DIM, line, color),
      "",
    );
  } else {
    rows.push(
      `  ${c(DIM, "version", color)}  ${VERSION}`,
      `  ${c(DIM, "docs   ", color)}  https://rpcedge.com/toolkit`,
      c(DIM, line, color),
      "",
    );
  }

  console.log(rows.join("\n"));
}

/** Compact step label between phases. */
export function printStep(n: number, total: number, label: string): void {
  const color = Boolean(process.stdout.isTTY);
  const badge = c(ACCENT, `[${n}/${total}]`, color);
  console.log(`${badge} ${c(HI, label, color)}`);
}
