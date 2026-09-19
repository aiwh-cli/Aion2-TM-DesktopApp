import { describe, it, expect } from "vitest";
import {
  normalizeProfile,
  normalizeTimer,
  parseImport,
  applyResets,
  resetBoundary,
  timerRemaining,
  nextRecurring,
  csvImport,
  csvExport,
  normalizeEntry,
  canConnect,
} from "./core";
describe("profile persistence and migration", () => {
  it("preserves desktop-only fields through browser import/export", () => {
    const p = parseImport(
      JSON.stringify({
        profile_name: "Ranger",
        tasks: { tasks: [{ title: "Raid", completed: true }], shopping: [] },
        build_planner: { rare_setting: 4 },
      }),
    )[0];
    expect(p.build_planner).toEqual({ rare_setting: 4 });
    expect(parseImport(JSON.stringify(p))[0].tasks.tasks[0].completed).toBe(
      true,
    );
  });
  it("rejects unrelated JSON and repairs malformed optional collections", () => {
    expect(() => parseImport("{}")).toThrow();
    expect(
      normalizeProfile({
        tasks: null,
        settings: { custom_timers: "x" },
        flow_maps: { bad: { nodes: null } },
      }).settings.custom_timers,
    ).toEqual([]);
  });
  it("resets daily and weekly entries once across missed days but preserves events", () => {
    const before = new Date(2026, 8, 13, 10);
    let p = applyResets(
      normalizeProfile({
        tasks: {
          tasks: [
            { title: "Day", schedule: "daily", completed: true },
            { title: "Week", schedule: "weekly", completed: true },
            { title: "Event", schedule: "event", completed: true },
          ],
        },
      }),
      before,
    );
    p = applyResets(p, new Date(2026, 8, 14, 10));
    expect(p.tasks.tasks.map((t) => t.completed)).toEqual([false, false, true]);
    expect(applyResets(p, new Date(2026, 8, 14, 10, 1))).toBe(p);
  });
  it("retains completions after a JSON round trip in the same reset period", () => {
    const now = new Date(2026, 8, 19, 15);
    const initial = applyResets(
      normalizeProfile({
        tasks: { tasks: [{ title: "Done", completed: true }] },
      }),
      now,
    );
    const restored = applyResets(
      normalizeProfile(JSON.parse(JSON.stringify(initial))),
      now,
    );
    expect(restored.tasks.tasks[0].completed).toBe(true);
    expect(restored.settings.web_last_daily).toBe(
      initial.settings.web_last_daily,
    );
  });
  it("does not clear completions on first import before a reset boundary is tracked", () => {
    const p = applyResets(
      normalizeProfile({
        tasks: { tasks: [{ title: "Done", completed: true }] },
      }),
    );
    expect(p.tasks.tasks[0].completed).toBe(true);
  });
});
describe("timers", () => {
  it("rolls daily and weekly next boundaries forward at the exact reset", () => {
    const now = new Date(2026, 8, 14, 9);
    expect(resetBoundary(now, "09:00", undefined, true).getDate()).toBe(15);
    expect(resetBoundary(now, "09:00", "Mo", true).getDate()).toBe(21);
  });
  it("counts from persisted timestamps instead of background tick counts", () => {
    const timer = normalizeTimer({
      timer_mode: "countdown",
      end: 100000,
      remaining: 99,
    });
    expect(timerRemaining(timer, new Date(85000))).toBe(15);
    expect(timerRemaining(timer, new Date(110000))).toBe(0);
  });
});
describe("data tools", () => {
  it("round trips quoted commas, newlines and quotes in CSV", () => {
    const source = normalizeEntry({
      title: 'Raid, "today"',
      description: "Line 1\nLine 2",
      amount: 3,
      price: 123,
    });
    const result = csvImport(csvExport([source]))[0];
    expect(result.title).toBe(source.title);
    expect(result.description).toBe(source.description);
    expect(result.amount * result.price).toBe(369);
  });
  it("rejects malformed CSV and prevents spreadsheet formula injection", () => {
    expect(() => csvImport('title\n"broken')).toThrow();
    expect(csvExport([normalizeEntry({ title: "=IMPORTXML(1)" })])).toContain(
      "'=IMPORTXML",
    );
  });
  it("prevents flow-map cycles", () => {
    const p = normalizeProfile({
      flow_maps: {
        map: {
          nodes: {
            a: { children: ["b"] },
            b: { children: ["c"] },
            c: { children: [] },
          },
        },
      },
    });
    expect(canConnect(p.flow_maps.map.nodes, "c", "a")).toBe(false);
    expect(canConnect(p.flow_maps.map.nodes, "a", "c")).toBe(true);
  });
});

describe("fixed recurring timer anchors", () => {
  it("counts a 48-hour interval down across two midnight boundaries", () => {
    const anchor = +new Date("2026-09-19T00:00:00Z");
    const timer = normalizeTimer({
      timer_mode: "custom",
      anchor_at: anchor,
      interval_seconds: 172800,
    });
    expect(timerRemaining(timer, new Date("2026-09-19T12:00:00Z"))).toBe(
      36 * 3600,
    );
    expect(timerRemaining(timer, new Date("2026-09-20T00:00:00Z"))).toBe(
      24 * 3600,
    );
    expect(timerRemaining(timer, new Date("2026-09-20T23:59:59Z"))).toBe(1);
    expect(timerRemaining(timer, new Date("2026-09-21T00:00:00Z"))).toBe(
      48 * 3600,
    );
  });
  it("keeps a seven-hour occurrence stable across midnight", () => {
    const anchor = +new Date("2026-09-19T00:00:00Z"),
      interval = 7 * 3600000;
    const expected = +new Date("2026-09-20T04:00:00Z");
    expect(
      nextRecurring(new Date("2026-09-19T23:59:59Z"), anchor, interval),
    ).toBe(expected);
    expect(
      nextRecurring(new Date("2026-09-20T00:00:00Z"), anchor, interval),
    ).toBe(expected);
  });
  it("uses a future first occurrence and advances at the exact boundary", () => {
    const anchor = +new Date("2026-10-01T09:00:00Z");
    expect(
      nextRecurring(new Date("2026-09-30T09:00:00Z"), anchor, 3600000),
    ).toBe(anchor);
    expect(nextRecurring(new Date(anchor), anchor, 3600000)).toBe(
      anchor + 3600000,
    );
  });
  it("persists the migrated desktop anchor through repeated JSON imports", () => {
    const timer = normalizeTimer({
      timer_mode: "hourly",
      start_time: "16:15",
      desktop_option: "preserved",
    });
    expect(Number.isFinite(timer.anchor_at)).toBe(true);
    const loaded = normalizeTimer(JSON.parse(JSON.stringify(timer)));
    expect(loaded.anchor_at).toBe(timer.anchor_at);
    expect(loaded.desktop_option).toBe("preserved");
    const future = normalizeTimer({
      ...loaded,
      anchor_at: +new Date("2027-01-01T12:00:00Z"),
    });
    expect(normalizeTimer(JSON.parse(JSON.stringify(future))).anchor_at).toBe(
      future.anchor_at,
    );
  });
});
