/** Paper path: never sends. Pretty or JSON via ui.logPaper. */
export { logPaper, type PaperEvent } from "./ui.js";

export function paperFollowNote(watchWallet: string): string {
  const short =
    watchWallet.length < 12
      ? watchWallet
      : `${watchWallet.slice(0, 4)}…${watchWallet.slice(-4)}`;
  return `paper: saw activity involving ${short} - DRY_RUN; no tx submitted`;
}
