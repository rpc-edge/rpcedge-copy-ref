/**
 * Research notes on the default demo wallet (as of 2026-07-31).
 * Keep this factual and cautious - community discourse is mixed.
 *
 * Address: bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa
 */

export const DEFAULT_WALLET_CONTEXT = {
  address: "bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa",
  short: "bwamJz…fSXa",
  /** How the street refers to it - not a verified legal name. */
  communityLabels: ["bwa", "bwam", "bwa wallet"],
  /**
   * Confidence: inferred from public X + explorer activity, not KYC.
   * Role: high-volume pump.fun-era token creator / deploy-style wallet.
   */
  roleHypothesis: "High-activity memecoin / pump.fun-style token deploy wallet",
  /** Mixed: some track for "AI deploy" flow; others blacklist as rug farm. */
  sentiment: "polarized",
  viralHypePotential: "high",
  viralHypeWhy: [
    "Very high on-chain token launch / trade activity → busy stream for demos",
    "Named often in copy-trade / trenches Telegram and X chatter",
    "Defined.fi and explorers show dense recent activity",
  ],
  brandRisks: [
    "Multiple public posts accuse the wallet of mass launches and rugs",
    "Some call for blacklisting the address",
    "Associating rpc edge as 'copy this wallet to profit' would be reckless",
  ],
  explorer: `https://explorer.solana.com/address/bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa`,
  solscan: `https://solscan.io/account/bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa`,
  asOf: "2026-07-31",
  confidence: "inferred",
} as const;
