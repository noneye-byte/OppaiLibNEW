import assert from "node:assert/strict";
import test from "node:test";
import { recordUIUpdate, resetUIMetrics, uiMetricsSnapshot } from "./ui-metrics.ts";

test("UI metrics aggregate bounded update timings and sort by total time", () => {
  resetUIMetrics();
  recordUIUpdate("library", 8);
  recordUIUpdate("library", 24);
  recordUIUpdate("chat", 40);

  const snapshot = uiMetricsSnapshot();
  assert.equal(snapshot.updates, 3);
  assert.equal(snapshot.slowUpdates, 2);
  assert.deepEqual(snapshot.timings.map((timing) => timing.name), ["chat", "library"]);
  assert.deepEqual(snapshot.timings.find((timing) => timing.name === "library"), {
    name: "library",
    count: 2,
    avgMs: 16,
    p95Ms: 24,
    maxMs: 24,
    slow: 1,
  });
});

test("UI metrics ignore invalid durations and cap component cardinality", () => {
  resetUIMetrics();
  recordUIUpdate("broken", Number.NaN);
  for (let i = 0; i < 40; i++) recordUIUpdate(`component-${i}`, 1);

  const snapshot = uiMetricsSnapshot();
  assert.equal(snapshot.updates, 40);
  assert.equal(snapshot.timings.length, 33);
  assert.equal(snapshot.timings.find((timing) => timing.name === "other components")?.count, 8);
  assert.equal(snapshot.timings.some((timing) => timing.name === "broken"), false);
});

test("reset starts a new empty browser metrics window", () => {
  recordUIUpdate("viewer", 12);
  resetUIMetrics();
  const snapshot = uiMetricsSnapshot();
  assert.equal(snapshot.updates, 0);
  assert.deepEqual(snapshot.timings, []);
  assert.ok(snapshot.windowSeconds >= 0);
});
