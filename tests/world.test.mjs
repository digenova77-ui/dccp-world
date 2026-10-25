import { test } from "node:test";
import assert from "node:assert/strict";
import { readHandoff, acceptHandoff, HANDOFF_KEY } from "../src/entry.js";
import { formatFigure } from "../src/format.js";
import { gpuBudget } from "../src/world.js";
import { TOKENS } from "../src/tokens.js";

function mem() {
  const store = new Map();
  return {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, v)
  };
}

test("world stays shut without a handoff", () => {
  assert.equal(readHandoff(mem()), null);
});

test("world opens only on an accepted HUD handoff", () => {
  const storage = mem();
  acceptHandoff(storage, { accepted: true });
  const record = readHandoff(storage);
  assert.equal(record.accepted, true);
  assert.equal(record.protocol, "DCCP/2");
  assert.equal(record.from, "hud");
});

test("a refused handoff does not open the world", () => {
  const storage = mem();
  assert.equal(acceptHandoff(storage, { accepted: false }), false);
  assert.equal(storage.getItem(HANDOFF_KEY), null);
});

test("large figures render in billions for the visitor locale", () => {
  assert.equal(formatFigure(1270000000, "en-US"), "1.27 billion");
  assert.equal(formatFigure(12, "en-US"), "12");
});

test("gpu budget caps DPR and drops antialias on dense screens", () => {
  const dense = gpuBudget(400, 800, 3);
  assert.equal(dense.pixelRatio, 2);
  assert.equal(dense.antialias, false);
  assert.equal(dense.preserveDrawingBuffer, false);
});

test("house tokens match the locked list", () => {
  assert.equal(TOKENS.background, "#07080c");
  assert.equal(TOKENS.foreground, "#f3efe6");
  assert.equal(TOKENS.orbs.residual.color, "#e8c36a");
  assert.equal(TOKENS.orbs.edge.color, "#14b8a6");
  assert.equal(TOKENS.orbs.research.color, "#00FF9D");
  assert.equal(TOKENS.orbs.dclm.color, "#00F5D4");
  assert.equal(TOKENS.orbs.unity.color, "#a855f7");
  assert.equal(TOKENS.orbs.efuse.color, "#2e7bff");
  assert.deepEqual(TOKENS.iris.cores, ["#14b8a6", "#14b8a6"]);
  assert.equal(TOKENS.iris.shell, "#a855f7");
});
