import assert from "node:assert/strict";
import { test } from "node:test";
import { record, stats } from "../convex/plays.js";

function database() {
  const tables = { playSessions: [], gameStats: [] };
  return {
    query(table) {
      return {
        withIndex(_index, filter) {
          let field, value;
          filter({ eq: (key, expected) => { field = key; value = expected; } });
          return { unique: async () => tables[table].find((row) => row[field] === value) ?? null };
        }
      };
    },
    async insert(table, value) {
      const id = `${table}-${tables[table].length}`;
      tables[table].push({ _id: id, ...value });
      return id;
    },
    async patch(id, value) {
      Object.assign(Object.values(tables).flat().find((row) => row._id === id), value);
    }
  };
}

const firstSession = "00000000-0000-4000-8000-000000000001";
const secondSession = "00000000-0000-4000-8000-000000000002";

test("retries and out-of-order saves count one play and the largest duration", async () => {
  const ctx = { db: database() };
  const save = (durationMs) => record._handler(ctx, {
    gameSlug: "hearthline", sessionId: firstSession, durationMs
  });
  await save(0);
  await save(0);
  await save(60000);
  await save(30000);
  await save(60000);
  assert.deepEqual(await stats._handler(ctx, { gameSlug: "hearthline" }), {
    plays: 1, durationMs: 60000
  });
});

test("a final save arriving before the initial save preserves duration and counts", async () => {
  const ctx = { db: database() };
  const save = (sessionId, durationMs, gameSlug = "hearthline") =>
    record._handler(ctx, { gameSlug, sessionId, durationMs });
  await save(firstSession, 3600000);
  await save(firstSession, 0);
  await save(secondSession, 1800000);
  assert.deepEqual(await stats._handler(ctx, { gameSlug: "hearthline" }), {
    plays: 2, durationMs: 5400000
  });
  assert.deepEqual(await stats._handler(ctx, { gameSlug: "horseland-jumper" }), {
    plays: 0, durationMs: 0
  });
  await assert.rejects(save(firstSession, 4000000, "horseland-jumper"), /another game/);
});

test("invalid duration, slug and session tokens cannot change totals", async () => {
  const ctx = { db: database() };
  for (const args of [
    { durationMs: -1 }, { durationMs: NaN }, { durationMs: Infinity },
    { durationMs: 1.5 }, { durationMs: Number.MAX_SAFE_INTEGER + 1 },
    { gameSlug: "bad/slug" }, { sessionId: "invalid" }
  ]) {
    await assert.rejects(record._handler(ctx, {
      gameSlug: "hearthline", sessionId: firstSession, durationMs: 0, ...args
    }), /Invalid play session/);
  }
  assert.deepEqual(await stats._handler(ctx, { gameSlug: "hearthline" }), {
    plays: 0, durationMs: 0
  });
});
