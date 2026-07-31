# Contributing

Thanks for improving the paper copy-watch reference.

## Scope

This repo is intentionally small: **doctor → watch wallet → paper log**. Prefer PRs that:

- fix bugs or clarify on-chain vs paper labels
- improve retry / reconnect reliability
- tighten docs without endorsing a strategy or wallet as alpha

Avoid PRs that add auto-trading, private-key handling, or strategy logic. That belongs in a different project.

## Dev

```bash
pnpm install
pnpm typecheck
pnpm doctor   # needs RPCEDGE_KEY in .env
pnpm start
```

- Node ≥ 20  
- Copy `.env.example` → `.env` (never commit `.env`)  
- Pretty logs by default; `LOG_JSON=1` for machines  

## Pull requests

1. Keep diffs focused.  
2. Run `pnpm typecheck`.  
3. Note any live RPC smoke you ran (redact keys).  
4. NFA: do not market “copy wallet X and profit.”  

## License

By contributing you agree your changes are MIT, same as the project.
