import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../game-cards.js", import.meta.url), "utf8");
const clientSource = readFileSync(new URL("../convex-client.js", import.meta.url), "utf8");
const settle = () => new Promise((resolve) => setImmediate(resolve));

function harness() {
  let now = 0;
  const calls = [];
  const cards = ["hearthline", "horseland-jumper"].map((slug) => {
    const listeners = {};
    const frame = {
      dataset: { src: `https://itch.io/${slug}` },
      addEventListener: (name, callback) => { listeners[`frame:${name}`] = callback; },
      setAttribute: (name, value) => { frame[name] = value; },
      getAttribute: (name) => frame[name]
    };
    const overlay = {
      dataset: {},
      addEventListener: (name, callback) => { listeners[`overlay:${name}`] = callback; }
    };
    const elements = { iframe: frame, ".play-overlay": overlay,
      '[data-stat="plays"]': { textContent: "--" },
      '[data-stat="hours"]': { textContent: "--" } };
    return { dataset: { game: slug }, classList: { add() {}, remove() {} },
      querySelector: (selector) => elements[selector], listeners, elements };
  });
  let heartbeat;
  let fail = false;
  let failWrite = false;
  const window = {
    CONVEX_CLIENT: {
      async stats() {
        if (fail) throw new Error("offline");
        return { plays: 2, durationMs: 3600000 };
      },
      async recordPlay(...args) {
        calls.push(args);
        if (failWrite) throw new Error("offline");
      }
    },
    setInterval(callback, delay) { assert.equal(delay, 30000); heartbeat = callback; }
  };
  vm.runInNewContext(source, {
    window, document: { addEventListener() {}, getElementById: () => null },
    crypto: { randomUUID: () => `session-${calls.length}` },
    Date: { now: () => now }, console: { error() {} }
  });
  window.GameCards.setupGameCards({ querySelectorAll: () => cards });
  return { cards, calls, window, tick: (value) => { now = value; },
    heartbeat: () => heartbeat(), offline: () => { fail = true; },
    writesOffline: (value) => { failWrite = value; } };
}

test("duplicate loads, background saves and returning to a tab keep one session", async () => {
  const h = harness();
  const card = h.cards[0];
  card.listeners["overlay:click"]();
  card.listeners["frame:load"]();
  card.listeners["frame:load"]();
  assert.equal(h.calls.length, 1);
  h.tick(30000);
  await h.heartbeat();
  await h.window.GameCards.finalizePlays();
  h.tick(60000);
  await h.heartbeat();
  assert.deepEqual(h.calls.map((call) => call[2]), [0, 30000, 30000, 60000]);
  assert.equal(new Set(h.calls.map((call) => call[1])).size, 1);
  assert.equal(card.elements['[data-stat="plays"]'].textContent, 2);
  assert.equal(card.elements['[data-stat="hours"]'].textContent, "1.00h");
});

test("switching games finalizes the previous session even before its start request settles", async () => {
  const h = harness();
  h.cards[0].listeners["overlay:click"]();
  h.cards[0].listeners["frame:load"]();
  h.tick(1000);
  h.cards[1].listeners["overlay:click"]();
  h.cards[1].listeners["frame:load"]();
  await settle();
  h.tick(2000);
  await h.heartbeat();
  assert.deepEqual(h.calls.map(([slug, , duration]) => [slug, duration]), [
    ["hearthline", 0], ["hearthline", 1000],
    ["horseland-jumper", 0], ["horseland-jumper", 1000]
  ]);
});

test("failed reads preserve displayed statistics instead of reporting zero", async () => {
  const h = harness();
  await settle();
  h.offline();
  h.cards[0].listeners["overlay:click"]();
  h.cards[0].listeners["frame:load"]();
  await settle();
  assert.equal(h.cards[0].elements['[data-stat="plays"]'].textContent, 2);
});

test("a failed save while switching games retries with the stopped duration", async () => {
  const h = harness();
  h.cards[0].listeners["overlay:click"]();
  h.cards[0].listeners["frame:load"]();
  await settle();
  h.tick(1000);
  h.writesOffline(true);
  h.cards[1].listeners["overlay:click"]();
  await settle();
  h.tick(60000);
  h.writesOffline(false);
  await h.heartbeat();
  assert.equal(h.calls.at(-1)[0], "hearthline");
  assert.equal(h.calls.at(-1)[2], 1000);
  assert.equal(h.calls.at(-1)[1], h.calls[0][1]);
});

test("HTTP client uses the supplied cloud deployment and detects Convex errors", async () => {
  const requests = [];
  let result = { status: "success", value: { plays: 3, durationMs: 42 } };
  const window = {};
  vm.runInNewContext(clientSource, { window, fetch: async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => result };
  } });
  assert.equal((await window.CONVEX_CLIENT.stats("hearthline")).plays, 3);
  assert.equal(requests[0].url, "https://animated-curlew-362.convex.cloud/api/query");
  assert.equal(JSON.parse(requests[0].options.body).path, "plays:stats");
  await window.CONVEX_CLIENT.recordPlay("hearthline", "session", 1000);
  assert.equal(requests[1].options.keepalive, true);
  assert.equal(requests[1].url, "https://animated-curlew-362.convex.cloud/api/mutation");
  result = { status: "error", errorMessage: "Function missing" };
  await assert.rejects(window.CONVEX_CLIENT.stats("hearthline"), /Function missing/);
});
