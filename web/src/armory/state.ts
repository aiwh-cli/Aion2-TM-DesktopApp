import { type Card, classes } from "./model";
export type Build = {
  id: string;
  name: string;
  className: string;
  race: string;
  gear: Record<string, { id: number; level: number; cap: number }>;
  wing: string;
  wingLevel: number;
  preferences: string[];
};
export type ArmoryState = {
  query: string;
  category: string;
  className: string;
  grade: string;
  mode: string;
  selected: number;
  comparison: number[];
  page: number;
  craft: {
    query: string;
    recipe: number;
    amount: number;
    recursive: boolean;
    prices: Record<string, number>;
    variants: Record<string, number>;
  };
  builds: Build[];
  build: string;
  compareBuild: string;
  set: string;
  skills: {
    query: string;
    monolith: number;
    stigmaBudget: number;
    levels: Record<string, number>;
    specs: Record<string, number[]>;
    favorites: string[];
    priority: string[];
  };
  board: {
    dataset: string;
    board: string;
    level: number;
    budget: number;
    selected: Record<string, string[]>;
    focus: string;
  };
  arcana: { cards: Record<string, Card>; wishes: Record<string, number> };
};
export const freshBuild = (): Build => ({
  id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
  name: "New loadout",
  className: "Gladiator",
  race: "light",
  gear: {},
  wing: "",
  wingLevel: 0,
  preferences: [],
});
export function createArmoryState(): ArmoryState {
  const b = freshBuild();
  return {
    query: "",
    category: "",
    className: "Gladiator",
    grade: "",
    mode: "",
    selected: 0,
    comparison: [],
    page: 0,
    craft: {
      query: "",
      recipe: 0,
      amount: 1,
      recursive: true,
      prices: {},
      variants: {},
    },
    builds: [b],
    build: b.id,
    compareBuild: "",
    set: "",
    skills: {
      query: "",
      monolith: 1,
      stigmaBudget: 0,
      levels: {},
      specs: {},
      favorites: [],
      priority: [],
    },
    board: {
      dataset: "s",
      board: "",
      level: 45,
      budget: 200,
      selected: {},
      focus: "",
    },
    arcana: { cards: {}, wishes: {} },
  };
}
const obj = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : {};
const str = (x: unknown, f = "") =>
  typeof x === "string" ? x.slice(0, 500) : f;
const num = (x: unknown, f = 0, max = 1e12) =>
  typeof x === "number" && Number.isFinite(x)
    ? Math.max(0, Math.min(max, x))
    : f;
const strings = (x: unknown) =>
  Array.isArray(x)
    ? x.filter((v): v is string => typeof v === "string").slice(0, 5000)
    : [];
const numbers = (x: unknown, max = 1e12) =>
  Object.fromEntries(
    Object.entries(obj(x))
      .filter(
        ([k, v]) =>
          k !== "__proto__" && typeof v === "number" && Number.isFinite(v),
      )
      .map(([k, v]) => [k, num(v, 0, max)]),
  );
export function normalizeArmoryState(value: unknown): ArmoryState {
  const d = createArmoryState(),
    v = obj(value),
    c = obj(v.craft),
    s = obj(v.skills),
    b = obj(v.board),
    a = obj(v.arcana);
  const builds = Array.isArray(v.builds)
    ? v.builds.slice(0, 100).map((x) => {
        const q = obj(x),
          gear: Build["gear"] = {};
        for (const [k, y] of Object.entries(obj(q.gear))) {
          const z = obj(y);
          gear[k] = {
            id: num(z.id),
            level: num(z.level, 0, 30),
            cap: num(z.cap, 15, 20),
          };
        }
        return {
          ...freshBuild(),
          id: str(q.id) || freshBuild().id,
          name: str(q.name, "Loadout"),
          className: classes.includes(str(q.className))
            ? str(q.className)
            : "Gladiator",
          race: q.race === "dark" ? "dark" : "light",
          gear,
          wing: str(q.wing),
          wingLevel: num(q.wingLevel, 0, 10),
          preferences: strings(q.preferences),
        };
      })
    : d.builds;
  const cards: Record<string, Card> = {};
  for (const [k, x] of Object.entries(obj(a.cards))) {
    const q = obj(x);
    cards[k] = {
      theme: str(q.theme, "Vigor"),
      grade: str(q.grade, "Unique"),
      rolls: Array.isArray(q.rolls)
        ? q.rolls
            .slice(0, 4)
            .map((y) => ({
              id: str(obj(y).id),
              level: num(obj(y).level, 1, 4),
            }))
        : [],
    };
  }
  return {
    ...d,
    query: str(v.query),
    category: str(v.category),
    className: classes.includes(str(v.className))
      ? str(v.className)
      : d.className,
    grade: str(v.grade),
    mode: str(v.mode),
    selected: num(v.selected),
    comparison: Array.isArray(v.comparison)
      ? v.comparison
          .filter(
            (x): x is number => typeof x === "number" && Number.isFinite(x),
          )
          .slice(0, 3)
      : [],
    page: num(v.page, 0, 10000),
    craft: {
      query: str(c.query),
      recipe: num(c.recipe),
      amount: Math.max(1, num(c.amount, 1, 1e6)),
      recursive: c.recursive !== false,
      prices: numbers(c.prices),
      variants: numbers(c.variants),
    },
    builds: builds.length ? builds : d.builds,
    build: str(v.build),
    compareBuild: str(v.compareBuild),
    set: str(v.set),
    skills: {
      query: str(s.query),
      monolith: num(s.monolith, 1, 30),
      stigmaBudget: num(s.stigmaBudget),
      levels: numbers(s.levels, 20),
      specs: Object.fromEntries(
        Object.entries(obj(s.specs)).map(([k, x]) => [
          k,
          Array.isArray(x)
            ? x.filter((z): z is number => typeof z === "number").slice(0, 3)
            : [],
        ]),
      ),
      favorites: strings(s.favorites),
      priority: strings(s.priority),
    },
    board: {
      dataset: b.dataset === "a" ? "a" : "s",
      board: str(b.board),
      level: num(b.level, 45, 45),
      budget: num(b.budget, 200, 10000),
      selected: Object.fromEntries(
        Object.entries(obj(b.selected)).map(([k, x]) => [k, strings(x)]),
      ),
      focus: str(b.focus),
    },
    arcana: { cards, wishes: numbers(a.wishes, 20) },
  };
}
