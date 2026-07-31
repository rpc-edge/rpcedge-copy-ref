<p align="center">
  <img src="docs/brand/rpcedge-chevron-accent-512.png" alt="rpc edge" width="72" />
</p>

<h1 align="center">rpcedge-copy-ref</h1>

<p align="center">
  <strong>Paper copy-watch reference for <a href="https://rpcedge.com">rpc edge</a></strong><br />
  Prove a key · watch one wallet · log what you saw · never auto-trade
</p>

<p align="center">
  <a href="https://github.com/rpc-edge/rpcedge-copy-ref/actions/workflows/ci.yml"><img src="https://github.com/rpc-edge/rpcedge-copy-ref/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/rpc-edge/rpcedge-copy-ref/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT" /></a>
  <a href="https://www.npmjs.com/package/rpcedge-sdk"><img src="https://img.shields.io/npm/v/rpcedge-sdk.svg?label=rpcedge-sdk" alt="rpcedge-sdk" /></a>
  <a href="https://rpcedge.com/toolkit"><img src="https://img.shields.io/badge/docs-toolkit-C5F23F?labelColor=08090A" alt="toolkit" /></a>
  <a href="https://rpcedge.com/for/copy-trading-bots"><img src="https://img.shields.io/badge/workload-copy--trading-111?labelColor=08090A" alt="copy-trading" /></a>
</p>

<p align="center">
  <em>Not a strategy. Not financial advice. Default mode never submits transactions.</em>
</p>

---

## 60-second start

```bash
git clone https://github.com/rpc-edge/rpcedge-copy-ref.git
cd rpcedge-copy-ref
pnpm install
cp .env.example .env
# edit .env → RPCEDGE_KEY=… from https://app.rpcedge.com/signup

pnpm doctor
pnpm start
```

After npm publish (optional):

```bash
export RPCEDGE_KEY=your-uuid-key
npx rpcedge-copy-ref@latest
# quiet seed: SEED_SAMPLE=0 npx rpcedge-copy-ref@latest
```

You should see a terminal header, doctor green on `rpc.rpcedge.com`, then paper events.

| Link | URL |
|---|---|
| Get a key | https://app.rpcedge.com/signup |
| Toolkit | https://rpcedge.com/toolkit |
| Copy-trading guide | https://rpcedge.com/for/copy-trading-bots |
| SDK / CLI / MCP | https://github.com/rpc-edge/rpcedge-toolkit |
| DLMM paper twin | https://github.com/rpc-edge/rpcedge-dlmm-ref |
| Contributing | [CONTRIBUTING.md](./CONTRIBUTING.md) · [SECURITY.md](./SECURITY.md) |

---

## What it does

| Step | Behavior |
|---|---|
| **Header** | Professional CLI banner (mode, auth, watch target) |
| **Doctor** | Proves `RPCEDGE_KEY` against rpc edge (`rpcedge-sdk`) |
| **Watch** | WebSocket `logsSubscribe` on the watch wallet via edge |
| **Paper** | JSON-lines only - no auto-mirror, no signing |
| **History index** | Optional public mainnet poll for address history (edge nodes do not index full history) |

Production bots add Yellowstone filters, simulation, size caps, and kill-switches. This repo is the **activation reference**: real key, real traffic, honest paper path.

**Why not `getSignaturesForAddress` on rpc edge?**  
Live trading RPCs usually do not index full address history (`Transaction history is not available from this node`). That is expected. Set `HISTORY_RPC_URL=off` to disable the public index helper.

---

## Default watch wallet (demo only)

| | |
|---|---|
| **Address** | `bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa` |
| **Explorer** | [Explorer](https://explorer.solana.com/address/bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa) · [Solscan](https://solscan.io/account/bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa) |
| **Why default** | High on-chain activity → dense demo feed |
| **Who** | **Not KYC-verified.** Street labels: **bwa / bwam**. Treated publicly as a high-volume pump.fun-style deploy wallet, not a named fund. |
| **Hype** | High for trenches demos · **high brand risk if endorsed as alpha** |
| **Policy** | rpc edge does **not** endorse copying this wallet for profit |

Confidence: inferred from explorers + open discourse as of **2026-07-31**. Override:

```bash
export WATCH_WALLET=YourBase58PubkeyHere
```

---

## Env

| Variable | Default | Notes |
|---|---|---|
| `RPCEDGE_KEY` | required for production path | https://app.rpcedge.com/signup |
| `WATCH_WALLET` | `bwamJzzt…fSXa` | Demo default |
| `MODE` | `paper` | `live` alone still paper-safe |
| `LIVE_SUBMIT` | `0` | Must be `1` **and** MODE=live for non-paper branch |
| `POLL_MS` / `POLL_LIMIT` | `2000` / `15` | History index poll only |
| `HISTORY_RPC_URL` | public mainnet in paper | Set `off` to use edge WS only |
| `SEED_SAMPLE` | `1` | Set `0` to skip the historical seed sample |
| `HEARTBEAT_MS` | `30000` | Edge `getSlot` probe; re-attach logsSubscribe on failure; `0` = off |
| `LOG_JSON` | off | `1` for machine-readable JSON events |

---

## Example output

Pretty by default. Use `LOG_JSON=1` for machine-readable events.

```text
────────────────────────────────────────────────────────
  ›››  rpc edge · copy-ref  v0.1.0
  run     paper  ·  key ok  ·  demo bwam…fSXa  ·  MIT · NFA
  site    rpcedge.com/toolkit  ·  app.rpcedge.com/signup
────────────────────────────────────────────────────────

[1/2] doctor
  result   OK  ·  rpc.rpcedge.com  ·  key env:RPCEDGE_KEY
  health   ok  slot …, getSlot … ms, solana-core …
  ends     grpc grpc.rpcedge.com:443  ·  relay relay.rpcedge.com
  next     doctor green → watch

[2/2] watch
  track    bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa
  note     demo · high-activity deploy wallet · polarized · NFA · …
  live     logsSubscribe #0  edge ws
  hist     api.mainnet-beta.solana.com  address index · not on edge
  opts     mode paper  ·  seed off  ·  hb 30s
  ready    batch 15  ·  13 ok / 2 err on-chain (wallet txs)  ·  listening
```

Full track wallet is printed once (watch panel). Doctor reuses the SDK client into watch (faster start). On-chain err counts are **wallet** history, not our paper path.

---

## Develop

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm start
```

## Stack

- [rpcedge-sdk](https://www.npmjs.com/package/rpcedge-sdk) · [rpcedge](https://www.npmjs.com/package/rpcedge) CLI · [rpcedge-mcp](https://www.npmjs.com/package/rpcedge-mcp)  
- Measure co-lo yourself with [solbench](https://github.com/rpc-edge/solbench) - no invented latency numbers  

---

## Safety

- Paper by default  
- No private keys in this repo; submit path never signs  
- NFA - memecoin copy-trading can and does lose money  
- Default wallet is for stream density demos, not “alpha”  
- Do not market “copy bwam and get rich” with the rpc edge brand  

---

## License

MIT - see [LICENSE](./LICENSE).
