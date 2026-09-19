export type Schedule = "daily" | "weekly" | "event" | "season" | "once";
export type Priority = "high" | "middle" | "low";
export interface Entry {
  id: string;
  title: string;
  description: string;
  schedule: Schedule;
  priority: Priority;
  completed: boolean;
  character: string;
  location: string;
  amount: number;
  price: number;
  currency: string;
  [key: string]: unknown;
}
export interface Timer {
  id: string;
  name: string;
  timer_mode: "daily" | "weekly" | "hourly" | "custom" | "countdown";
  reset_time: string;
  reset_day: string;
  start_time: string;
  interval_minutes: number;
  interval_seconds: number;
  countdown_duration_seconds: number;
  remaining: number;
  end: number | null;
  color: string;
  category: string;
  [key: string]: unknown;
}
export interface FlowNode {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: string;
  completed: boolean;
  x: number;
  y: number;
  children: string[];
  [key: string]: unknown;
}
export interface FlowMap {
  nodes: Record<string, FlowNode>;
  root_node_id?: string;
  [key: string]: unknown;
}
export interface Settings {
  daily_reset_time: string;
  weekly_reset_time: string;
  weekly_reset_day: string;
  shugo_enabled: boolean;
  shugo_start_minute: number;
  shugo_interval_text: string;
  riss_enabled: boolean;
  riss_anchor_hour: number;
  riss_interval_text: string;
  custom_timers: Timer[];
  web_last_daily: number;
  web_last_weekly: number;
  [key: string]: unknown;
}
export interface Profile {
  id: string;
  profile_name: string;
  theme: string;
  settings: Settings;
  tasks: { tasks: Entry[]; shopping: Entry[]; [key: string]: unknown };
  flow_maps: Record<string, FlowMap>;
  active_flow_map: string;
  item_templates: Entry[];
  task_templates: Entry[];
  web_armory?: unknown;
  [key: string]: unknown;
}
export interface Store {
  version: 1;
  activeId: string;
  profiles: Profile[];
}
export const STORAGE_KEY = "aion2-companion-v1";
export const uid = () => crypto.randomUUID();
export const record = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : {};
export const str = (x: unknown, fallback = "") =>
  typeof x === "string" ? x.slice(0, 10000) : fallback;
export const num = (x: unknown, fallback = 0, max = 1e12) =>
  Number.isFinite(Number(x)) ? Math.max(0, Math.min(max, Number(x))) : fallback;
export const time = (x: unknown, fallback = "09:00") =>
  typeof x === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(x) ? x : fallback;
const list = (x: unknown) => (Array.isArray(x) ? x.slice(0, 10000) : []);
export const DAYS = ["Sun", "Mo", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayAliases: Record<string, number> = {
  Sun: 0,
  So: 0,
  Mo: 1,
  Mon: 1,
  Di: 2,
  Tue: 2,
  Mi: 3,
  Wed: 3,
  Do: 4,
  Thu: 4,
  Fr: 5,
  Fri: 5,
  Sa: 6,
  Sat: 6,
};
export function normalizeEntry(value: unknown): Entry {
  const x = record(value);
  return {
    ...x,
    id: str(x.id) || str(x.card_id) || uid(),
    title: str(x.title, "Untitled"),
    description: str(x.description),
    schedule: ["daily", "weekly", "event", "season", "once"].includes(
      str(x.schedule),
    )
      ? (x.schedule as Schedule)
      : x.event
        ? "event"
        : "daily",
    priority: ["high", "middle", "low"].includes(str(x.priority))
      ? (x.priority as Priority)
      : "middle",
    completed: x.completed === true,
    character: str(x.character),
    location: str(x.location),
    amount: num(x.amount, 1),
    price: num(x.price),
    currency: str(x.currency, "kinah"),
  };
}
export function normalizeTimer(value: unknown): Timer {
  const x = record(value),
    duration = Math.max(1, num(x.countdown_duration_seconds, 600));
  return {
    ...x,
    id: str(x.id) || uid(),
    name: str(x.name, "Timer"),
    timer_mode: ["daily", "weekly", "hourly", "custom", "countdown"].includes(
      str(x.timer_mode),
    )
      ? (x.timer_mode as Timer["timer_mode"])
      : "countdown",
    reset_time: time(x.reset_time),
    reset_day: DAYS[dayAliases[str(x.reset_day)] ?? 1],
    start_time: time(x.start_time, "00:00"),
    interval_minutes: Math.max(1, num(x.interval_minutes, 60)),
    interval_seconds: Math.max(1, num(x.interval_seconds, 3600)),
    countdown_duration_seconds: duration,
    remaining: num(x.remaining, duration),
    end: typeof x.end === "number" && Number.isFinite(x.end) ? x.end : null,
    color: /^#[0-9a-f]{6}$/i.test(str(x.color))
      ? (x.color as string)
      : "#c6b78c",
    category: str(x.category, "Custom"),
  };
}
export function normalizeProfile(value: unknown, newId = false): Profile {
  const x = record(value),
    s = record(x.settings),
    t = record(x.tasks),
    maps: Record<string, FlowMap> = {};
  for (const [name, raw] of Object.entries(record(x.flow_maps)).slice(0, 50)) {
    const m = record(raw),
      nodes: Record<string, FlowNode> = {};
    for (const [id, rawNode] of Object.entries(record(m.nodes)).slice(
      0,
      1000,
    )) {
      const n = record(rawNode);
      nodes[id] = {
        ...n,
        id,
        title: str(n.title, "New step"),
        description: str(n.description),
        icon: str(n.icon, "level"),
        status: ["active", "completed", "optional", "locked"].includes(
          str(n.status),
        )
          ? (n.status as string)
          : "locked",
        completed: n.completed === true,
        x: num(n.x, 40, 8000),
        y: num(n.y, 40, 8000),
        children: list(n.children).filter(
          (v): v is string => typeof v === "string",
        ),
      };
    }
    for (const n of Object.values(nodes))
      n.children = n.children.filter((id) => id !== n.id && Boolean(nodes[id]));
    maps[name] = { ...m, nodes };
  }
  if (!Object.keys(maps).length) maps["My progression"] = { nodes: {} };
  const active = str(x.active_flow_map);
  return {
    ...x,
    id: newId ? uid() : str(x.id) || uid(),
    profile_name: str(x.profile_name, "Adventurer").slice(0, 80),
    theme: [
      "abyss",
      "inferno",
      "emerald",
      "frostbite",
      "obsidian",
      "void",
    ].includes(str(x.theme))
      ? str(x.theme)
      : "abyss",
    settings: {
      ...s,
      daily_reset_time: time(s.daily_reset_time),
      weekly_reset_time: time(s.weekly_reset_time),
      weekly_reset_day: DAYS[dayAliases[str(s.weekly_reset_day)] ?? 1],
      shugo_enabled: s.shugo_enabled !== false,
      shugo_start_minute: num(s.shugo_start_minute, 15, 59),
      shugo_interval_text: str(s.shugo_interval_text, "30min"),
      riss_enabled: s.riss_enabled !== false,
      riss_anchor_hour: num(s.riss_anchor_hour, 0, 23),
      riss_interval_text: str(s.riss_interval_text, "1h"),
      custom_timers: list(s.custom_timers).map(normalizeTimer),
      web_last_daily: num(s.web_last_daily, 0, Number.MAX_SAFE_INTEGER),
      web_last_weekly: num(s.web_last_weekly, 0, Number.MAX_SAFE_INTEGER),
    },
    tasks: {
      ...t,
      tasks: list(t.tasks).map(normalizeEntry),
      shopping: list(t.shopping).map(normalizeEntry),
    },
    flow_maps: maps,
    active_flow_map: maps[active] ? active : Object.keys(maps)[0],
    item_templates: list(x.item_templates).map(normalizeEntry),
    task_templates: list(x.task_templates).map(normalizeEntry),
  };
}
export function parseImport(text: string): Profile[] {
  if (text.length > 12_000_000)
    throw new Error("This file is too large. Import a profile under 12 MB.");
  const raw = JSON.parse(text),
    root = record(raw),
    values = Array.isArray(root.profiles) ? root.profiles : [raw];
  if (!values.length || values.length > 50)
    throw new Error("Import between 1 and 50 profiles.");
  if (
    values.some(
      (x) =>
        !Object.keys(record(x)).length ||
        !("tasks" in record(x)) ||
        typeof record(x).profile_name !== "string",
    )
  )
    throw new Error(
      "Choose an Aion2 desktop profile or browser backup JSON file.",
    );
  return values.map((x) => normalizeProfile(x, true));
}
export function normalizeStore(raw: unknown): Store {
  const x = record(raw);
  if (x.version !== 1 || !Array.isArray(x.profiles) || !x.profiles.length)
    throw new Error(
      "The saved profiles could not be read. Download a recovery copy before resetting.",
    );
  const profiles = x.profiles.map((p) => normalizeProfile(p));
  return {
    version: 1,
    profiles,
    activeId: profiles.some((p) => p.id === x.activeId)
      ? str(x.activeId)
      : profiles[0].id,
  };
}
export function resetBoundary(
  now: Date,
  resetTime: string,
  day?: string,
  next = false,
): Date {
  const [h, m] = resetTime.split(":").map(Number),
    d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (day !== undefined) {
    const target = dayAliases[day] ?? 1;
    d.setDate(d.getDate() + target - d.getDay());
    if (next ? d <= now : d > now) d.setDate(d.getDate() + (next ? 7 : -7));
  } else if (next ? d <= now : d > now)
    d.setDate(d.getDate() + (next ? 1 : -1));
  return d;
}
export function applyResets(profile: Profile, now = new Date()): Profile {
  const daily = +resetBoundary(now, profile.settings.daily_reset_time),
    weekly = +resetBoundary(
      now,
      profile.settings.weekly_reset_time,
      profile.settings.weekly_reset_day,
    ),
    s = profile.settings;
  const rd = s.web_last_daily > 0 && daily > s.web_last_daily,
    rw = s.web_last_weekly > 0 && weekly > s.web_last_weekly;
  if (daily === s.web_last_daily && weekly === s.web_last_weekly)
    return profile;
  const reset = (items: Entry[]) =>
    items.map((x) =>
      (rd && x.schedule === "daily") || (rw && x.schedule === "weekly")
        ? { ...x, completed: false }
        : x,
    );
  return {
    ...profile,
    settings: { ...s, web_last_daily: daily, web_last_weekly: weekly },
    tasks: {
      ...profile.tasks,
      tasks: reset(profile.tasks.tasks),
      shopping: reset(profile.tasks.shopping),
    },
  };
}
export function intervalMs(text: string): number {
  const match = text.match(/^(\d+(?:\.\d+)?)\s*(min|h|m)$/);
  return match
    ? Math.max(60000, Number(match[1]) * (match[2] === "h" ? 3600000 : 60000))
    : 3600000;
}
export function nextInterval(
  now: Date,
  anchorTime: string,
  interval: number,
): number {
  const anchor = +resetBoundary(now, anchorTime),
    delta = +now - anchor;
  return anchor + (Math.floor(delta / interval) + 1) * interval;
}
export function timerRemaining(timer: Timer, now: Date): number {
  if (timer.timer_mode === "countdown")
    return Math.max(
      0,
      timer.end === null ? timer.remaining : (timer.end - +now) / 1000,
    );
  if (timer.timer_mode === "daily" || timer.timer_mode === "weekly")
    return (
      (+resetBoundary(
        now,
        timer.reset_time,
        timer.timer_mode === "weekly" ? timer.reset_day : undefined,
        true,
      ) -
        +now) /
      1000
    );
  return (
    (nextInterval(
      now,
      timer.start_time,
      (timer.timer_mode === "hourly"
        ? timer.interval_minutes * 60
        : timer.interval_seconds) * 1000,
    ) -
      +now) /
    1000
  );
}
export function countdown(seconds: number): string {
  let n = Math.max(0, Math.ceil(seconds));
  const days = Math.floor(n / 86400);
  n %= 86400;
  const h = Math.floor(n / 3600),
    m = Math.floor((n % 3600) / 60),
    s = n % 60;
  return `${days ? days + "d " : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
export function canConnect(
  nodes: Record<string, FlowNode>,
  from: string,
  to: string,
): boolean {
  if (from === to || !nodes[from] || !nodes[to]) return false;
  const visited = new Set<string>(),
    pending = [to];
  while (pending.length) {
    const id = pending.pop()!;
    if (id === from) return false;
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...(nodes[id]?.children ?? []));
  }
  return true;
}
export function csvExport(rows: Entry[]): string {
  const headers = [
    "title",
    "description",
    "schedule",
    "priority",
    "character",
    "location",
    "amount",
    "price",
    "currency",
  ];
  const quote = (x: unknown) => {
    let s = String(x ?? "");
    if (/^[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => quote(r[h])).join(",")),
  ].join("\r\n");
}
export function csvImport(text: string): Entry[] {
  if (text.length > 2_000_000)
    throw new Error("Choose a CSV smaller than 2 MB.");
  const rows: string[][] = [],
    row: string[] = [];
  let cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(cell);
      cell = "";
      if (c !== ",") {
        rows.push([...row]);
        row.length = 0;
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else cell += c;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const headers = (rows.shift() ?? []).map((x) =>
    x
      .trim()
      .replace(/^\uFEFF/, "")
      .toLowerCase(),
  );
  if (!headers.includes("title"))
    throw new Error(
      "The CSV needs a title column. Export a list for the template.",
    );
  return rows
    .filter((row) => row.some(Boolean))
    .slice(0, 10000)
    .map((row) =>
      normalizeEntry(
        Object.fromEntries(headers.map((key, i) => [key, row[i] ?? ""])),
      ),
    );
}
export function download(
  name: string,
  data: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
