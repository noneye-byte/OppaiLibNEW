import type { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Browser-side update profiling for the handful of large Lit surfaces.
 *
 * Server timings cannot explain a fast request followed by a sticky navigation or
 * gallery update. Lit's controller lifecycle brackets the complete component update
 * (render plus DOM commit), which is the useful boundary here. Durations go into
 * fixed buckets instead of an ever-growing array, and component names are constants
 * supplied at the call sites, so leaving this enabled cannot become its own leak.
 */

const UPDATE_BUCKETS_MS = [1, 2, 4, 8, 16, 33, 50, 100, 250];
const MAX_COMPONENTS = 32;
const SLOW_UPDATE_MS = 16;

interface Histogram {
  count: number;
  sumMs: number;
  maxMs: number;
  slow: number;
  buckets: number[];
}

export interface UIUpdateTiming {
  name: string;
  count: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  slow: number;
}

export interface UIMetricsSnapshot {
  windowSeconds: number;
  updates: number;
  slowUpdates: number;
  longTasks: number;
  longTaskMs: number;
  layoutShifts: number;
  layoutShiftScore: number;
  timings: UIUpdateTiming[];
}

let since = clock();
let longTasks = 0;
let longTaskMs = 0;
let layoutShifts = 0;
let layoutShiftScore = 0;
const histograms = new Map<string, Histogram>();
const attached = new WeakSet<object>();
let observersStarted = false;

function clock(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function histogramFor(name: string): Histogram {
  let key = name;
  if (!histograms.has(key) && histograms.size >= MAX_COMPONENTS) key = "other components";
  let histogram = histograms.get(key);
  if (!histogram) {
    histogram = { count: 0, sumMs: 0, maxMs: 0, slow: 0, buckets: Array(UPDATE_BUCKETS_MS.length + 1).fill(0) };
    histograms.set(key, histogram);
  }
  return histogram;
}

/** Records one complete component update. Exported so the aggregation can be tested
 * without making a fake Lit host; application code normally uses profileUpdates. */
export function recordUIUpdate(name: string, durationMs: number): void {
  if (!Number.isFinite(durationMs)) return;
  const ms = Math.max(0, durationMs);
  const histogram = histogramFor(name);
  histogram.count++;
  histogram.sumMs += ms;
  histogram.maxMs = Math.max(histogram.maxMs, ms);
  if (ms > SLOW_UPDATE_MS) histogram.slow++;
  const bucket = UPDATE_BUCKETS_MS.findIndex((boundary) => ms <= boundary);
  histogram.buckets[bucket < 0 ? UPDATE_BUCKETS_MS.length : bucket]++;
}

function quantile(histogram: Histogram, fraction: number): number {
  if (!histogram.count) return 0;
  const rank = Math.max(1, Math.ceil(histogram.count * fraction));
  let seen = 0;
  for (let i = 0; i < histogram.buckets.length; i++) {
    seen += histogram.buckets[i];
    if (seen >= rank) {
      // The overflow bucket has no finite upper edge. Its observed maximum is the
      // only honest value; finite buckets use their boundary as an estimate.
      return i === UPDATE_BUCKETS_MS.length ? histogram.maxMs : Math.min(histogram.maxMs, UPDATE_BUCKETS_MS[i]);
    }
  }
  return histogram.maxMs;
}

export function uiMetricsSnapshot(): UIMetricsSnapshot {
  const timings = [...histograms.entries()].map(([name, histogram]) => ({
    name,
    count: histogram.count,
    avgMs: round2(histogram.sumMs / Math.max(1, histogram.count)),
    p95Ms: round2(quantile(histogram, 0.95)),
    maxMs: round2(histogram.maxMs),
    slow: histogram.slow,
  }));
  timings.sort((a, b) => (b.avgMs * b.count) - (a.avgMs * a.count) || a.name.localeCompare(b.name));
  return {
    windowSeconds: Math.max(0, (clock() - since) / 1000),
    updates: timings.reduce((total, timing) => total + timing.count, 0),
    slowUpdates: timings.reduce((total, timing) => total + timing.slow, 0),
    longTasks,
    longTaskMs: round2(longTaskMs),
    layoutShifts,
    layoutShiftScore: round2(layoutShiftScore),
    timings,
  };
}

export function resetUIMetrics(): void {
  histograms.clear();
  longTasks = 0;
  longTaskMs = 0;
  layoutShifts = 0;
  layoutShiftScore = 0;
  since = clock();
}

function startPerformanceObservers(): void {
  if (observersStarted || typeof PerformanceObserver === "undefined") return;
  observersStarted = true;
  const supported = PerformanceObserver.supportedEntryTypes ?? [];
  if (supported.includes("longtask")) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks++;
        longTaskMs += entry.duration;
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  }
  if (supported.includes("layout-shift")) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        // User-initiated movement is expected; CLS only counts unexpected shifts.
        if (shift.hadRecentInput) continue;
        layoutShifts++;
        layoutShiftScore += shift.value ?? 0;
      }
    });
    observer.observe({ type: "layout-shift", buffered: true });
  }
}

class UpdateProfiler implements ReactiveController {
  private started = 0;
  private readonly name: string;

  constructor(host: ReactiveControllerHost, name: string) {
    this.name = name;
    host.addController(this);
  }

  hostUpdate(): void {
    this.started = clock();
  }

  hostUpdated(): void {
    recordUIUpdate(this.name, clock() - this.started);
  }
}

/** Attach once from a component's connectedCallback. The WeakSet makes reconnects
 * idempotent, which matters when navigation removes and restores a view. */
export function profileUpdates(host: ReactiveControllerHost & object, name: string): void {
  if (attached.has(host)) return;
  attached.add(host);
  startPerformanceObservers();
  new UpdateProfiler(host, name);
}
