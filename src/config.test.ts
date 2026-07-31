import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadConfig, DEFAULT_WATCH_WALLET } from "./config.js";

describe("loadConfig", () => {
  const prev = { ...process.env };

  function restore() {
    for (const k of Object.keys(process.env)) {
      if (!(k in prev)) delete process.env[k];
    }
    Object.assign(process.env, prev);
  }

  it("defaults to paper + demo wallet + seed sample on", () => {
    delete process.env.WATCH_WALLET;
    delete process.env.MODE;
    delete process.env.LIVE_SUBMIT;
    delete process.env.SEED_SAMPLE;
    delete process.env.HEARTBEAT_MS;
    const cfg = loadConfig();
    assert.equal(cfg.watchWallet, DEFAULT_WATCH_WALLET);
    assert.equal(cfg.mode, "paper");
    assert.equal(cfg.liveSubmit, false);
    assert.equal(cfg.seedSample, true);
    assert.equal(cfg.heartbeatMs, 30_000);
    restore();
  });

  it("SEED_SAMPLE=0 disables seed", () => {
    process.env.SEED_SAMPLE = "0";
    const cfg = loadConfig();
    assert.equal(cfg.seedSample, false);
    restore();
  });

  it("MODE=live without LIVE_SUBMIT stays paper-safe", () => {
    process.env.MODE = "live";
    delete process.env.LIVE_SUBMIT;
    const cfg = loadConfig();
    assert.equal(cfg.mode, "paper");
    assert.equal(cfg.liveSubmit, false);
    restore();
  });

  it("rejects invalid WATCH_WALLET", () => {
    process.env.WATCH_WALLET = "not-a-key!!!";
    assert.throws(() => loadConfig(), /invalid/);
    restore();
  });
});
