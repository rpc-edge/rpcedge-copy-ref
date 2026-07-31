/**
 * Paper path: never sends. Logs a would-follow event for demos and wiring tests.
 */

export type PaperEvent = {
  at: string;
  signature: string;
  slot?: number | null;
  err?: unknown;
  feePayer?: string | null;
  note: string;
};

export function logPaper(event: PaperEvent): void {
  const line = {
    type: "paper",
    ...event,
  };
  console.log(JSON.stringify(line));
}

export function paperFollowNote(watchWallet: string): string {
  return `paper: saw activity involving ${short(watchWallet)} - DRY_RUN; no tx submitted`;
}

function short(pk: string): string {
  if (pk.length < 12) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}
