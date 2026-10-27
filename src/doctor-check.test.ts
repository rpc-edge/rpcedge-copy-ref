import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

describe("doctor-check source", () => {
  // Regression: doctor once ran `npx --yes rpcedge@latest doctor` with the full
  // process environment. The SDK path does the same check in-process.
  it("never spawns a child process, npx, or a mutable dist-tag", () => {
    const src = readFileSync(join(here, "doctor-check.ts"), "utf8");
    assert.doesNotMatch(src, /\bnpx\b/);
    assert.doesNotMatch(src, /@latest/);
    assert.doesNotMatch(src, /child_process/);
  });
});
