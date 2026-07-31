import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createStats, recordPaper, totalPaper, statsSnapshot } from "./stats.js";

describe("stats", () => {
  it("counts paper sources and on-chain results", () => {
    const s = createStats();
    recordPaper(s, "seed", null);
    recordPaper(s, "history", { err: 1 });
    recordPaper(s, "live", null);
    assert.equal(s.paper.seed, 1);
    assert.equal(s.paper.history, 1);
    assert.equal(s.paper.live, 1);
    assert.equal(totalPaper(s), 3);
    assert.equal(s.onChain.ok, 2);
    assert.equal(s.onChain.failed, 1);
    const snap = statsSnapshot(s);
    assert.equal((snap.paper as { total: number }).total, 3);
  });
});
