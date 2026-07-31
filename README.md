# rpcedge-copy-ref

**Minimal Solana copy-watch reference for [rpc edge](https://rpcedge.com).**

Prove a key → watch one wallet’s signatures → **paper-log** what you saw.  
Not a strategy. Not financial advice. Default mode never submits transactions.

```bash
export RPCEDGE_KEY=your-uuid-key   # https://app.rpcedge.com/signup
pnpm install
pnpm doctor                        # or: npx rpcedge@latest doctor
pnpm start
```

Human toolkit page: https://rpcedge.com/toolkit  
Workload guide: https://rpcedge.com/for/copy-trading-bots

---

## Default watch wallet (demo only)

| | |
|---|---|
| **Address** | `bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa` |
| **Explorer** | [Solana Explorer](https://explorer.solana.com/address/bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa) · [Solscan](https://solscan.io/account/bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa) |
| **Why it’s the default** | Very high recent on-chain activity → dense feed for wiring demos |
| **Who it is** | **Not KYC-verified.** Street labels: **“bwa” / “bwam”**. Public discourse treats it as a high-volume **pump.fun-style token deploy / memecoin-dev wallet**, not a named fund or verified celebrity trader. |
| **Viral / hype potential** | **High** for trenches/copy-trade content (busy stream, often named on X). |
| **Brand risk** | **High if misused.** Multiple public posts accuse the wallet of mass launches and rugs; others track it as an “AI deploy” style creator. **rpc edge does not endorse copying this wallet for profit.** |

**Confidence:** inferred from public explorers + open X discourse as of **2026-07-31**. Re-verify before you use any label in marketing.

Override anytime:

```bash
export WATCH_WALLET=YourBase58PubkeyHere
```

---

## What this is

| Layer | Behavior |
|---|---|
| `pnpm doctor` | Runs `npx rpcedge doctor` (falls back to SDK doctor) |
| `pnpm start` | **WebSocket `logsSubscribe`** on the watch wallet via `rpcedge-sdk` Connection |
| `MODE=paper` (default) | JSON-lines “would follow” logs only |
| `MODE=live` + `LIVE_SUBMIT=1` | Stub only - **no auto-mirror** (you wire your own risk stack) |

**Why not `getSignaturesForAddress` on rpc edge?**  
Live trading RPCs usually **do not** index full address history (`Transaction history is not available from this node`). That is expected. Optional: set `HISTORY_RPC_URL` to an indexer/archive endpoint if you also want history polls.

This is the **activation reference** for rpc edge: real key, real RPC traffic, honest paper path. Production copy bots usually add Yellowstone filters, simulation, size caps, and human kill-switches - not this repo.

---

## Setup

```bash
git clone https://github.com/rpc-edge/rpcedge-copy-ref.git
cd rpcedge-copy-ref
pnpm install
cp .env.example .env
# edit .env → RPCEDGE_KEY=...
pnpm doctor
pnpm start
```

### Env

| Variable | Default | Notes |
|---|---|---|
| `RPCEDGE_KEY` | (required) | From https://app.rpcedge.com/signup |
| `WATCH_WALLET` | `bwamJzzt…fSXa` | Demo default - override for real work |
| `MODE` | `paper` | `live` alone still paper-safe |
| `LIVE_SUBMIT` | `0` | Must be `1` **and** MODE=live for non-paper branch |
| `POLL_MS` | `2000` | Signature poll interval |
| `POLL_LIMIT` | `15` | Signatures per poll |

---

## Example paper output

```json
{"type":"paper","at":"2026-07-31T12:00:00.000Z","signature":"…","slot":123,"feePayer":"…","note":"paper: saw activity involving bwam… - DRY_RUN; no tx submitted"}
```

---

## Stack

- [rpcedge-sdk](https://www.npmjs.com/package/rpcedge-sdk) - `RpcEdge.fromEnv()`, Connection helper  
- [rpcedge](https://www.npmjs.com/package/rpcedge) CLI - doctor  
- Optional next step: [rpcedge-mcp](https://www.npmjs.com/package/rpcedge-mcp) for agent-side health/fees  

Measure co-located latency yourself with [solbench](https://github.com/rpc-edge/solbench). This repo does not invent latency numbers.

---

## Safety

- **Paper by default.**  
- **No private keys** in this repo; submit path never signs.  
- **NFA.** Memecoin copy-trading can and does lose money.  
- Default wallet is for **stream density demos**, not “alpha.”  
- Do not use rpc edge marketing that says “copy bwam and get rich.”

---

## License

MIT - see [LICENSE](./LICENSE).
