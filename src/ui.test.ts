import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { onChainStatus, shortAddr, shortSig } from "./ui.js";

describe("onChainStatus", () => {
  it("labels success", () => {
    assert.deepEqual(onChainStatus(null), { ok: true, label: "on-chain ok" });
    assert.deepEqual(onChainStatus(undefined), { ok: true, label: "on-chain ok" });
  });

  it("labels string errors", () => {
    const r = onChainStatus("InstructionError");
    assert.equal(r.ok, false);
    assert.match(r.label, /on-chain failed/);
  });

  it("labels InstructionError objects", () => {
    const r = onChainStatus({ InstructionError: [0, "Custom"] });
    assert.equal(r.ok, false);
    assert.match(r.label, /instruction error/i);
  });
});

describe("short helpers", () => {
  it("shortens addresses and sigs", () => {
    const pk = "bwamJzztZsepfkteWRChggmXuiiCQvpLqPietdNfSXa";
    assert.equal(shortAddr(pk), "bwam…fSXa");
    assert.match(shortSig("abcdefghijklmnopABCDEFGHIJKLMNOP"), /…/);
  });
});
