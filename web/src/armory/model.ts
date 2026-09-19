export type Item = {
  id: number;
  name: string;
  grade: string;
  options: string[];
  categoryName: string;
  classNames: string[];
  tradable?: boolean;
};
export type Recipe = {
  id: number;
  goldCost: string;
  remoteGoldCost?: string;
  qualificationRace: string;
  mainCategory: string;
  inputs: { id: number; name: string; qty: number }[];
  outputs: { id: number; name: string; qty: number }[];
};
export type Skill = {
  id: string;
  name: string;
  mainCategory: string;
  type: string;
  description: string;
  specializations: {
    id: number;
    specialized: string;
    parentSkillLvl: number;
  }[];
};
export type Node = {
  id: string;
  b: string;
  r: number;
  c: number;
  name: string;
  g: string;
  lvl: number;
  cost: number;
  e: { t: string; n?: string; skill_id?: string; v: number }[];
};
export type Roll = { id: string; name: string; type: string };
export type Card = {
  theme: string;
  grade: string;
  rolls: { id: string; level: number }[];
};
export const classes = [
  "Gladiator",
  "Templar",
  "Assassin",
  "Ranger",
  "Sorcerer",
  "Elementalist",
  "Cleric",
  "Chanter",
  "Fighter",
];
export const slots: Record<string, string[]> = {
  Weapon: [
    "Greatsword",
    "Longsword",
    "Dagger",
    "Bow",
    "Spellbook",
    "Orb",
    "Mace",
    "Staff",
    "Fist",
  ],
  Guard: ["Guard"],
  Helm: ["Helm"],
  Top: ["Top"],
  Pauldrons: ["Pauldrons"],
  Gloves: ["Gloves"],
  Legs: ["Legs"],
  Shoes: ["Shoes"],
  Cloak: ["Cloak"],
  Belt: ["Belt"],
  Necklace: ["Necklace"],
  Earrings: ["Earrings"],
  Earrings2: ["Earrings"],
  Ring: ["Ring"],
  Ring2: ["Ring"],
  Bracelet: ["Bracelet"],
  Bracelet2: ["Bracelet"],
  Brooch: ["Brooch"],
  Brooch2: ["Brooch"],
  Amulet: ["Amulet"],
};
export function fits(item: Item, slot: string, cls: string, race = "light") {
  return (
    !!slots[slot]?.includes(item.categoryName) &&
    (!item.classNames?.length ||
      item.classNames.some((c) => c.toLowerCase() === cls.toLowerCase())) &&
    !(race === "light"
      ? item.name.includes("Archon")
      : item.name.includes("Guardian"))
  );
}
export function monolith(level: number) {
  return [
    [2, 2, 1],
    [3, 9, 2],
    [10, 14, 3],
    [15, 19, 4],
    [20, 24, 5],
    [25, 29, 6],
    [30, 30, 7],
  ].reduce(
    (n, [lo, hi, v]) => n + Math.max(0, Math.min(hi, level) - lo + 1) * v,
    0,
  );
}
export function specCap(level: number) {
  return level >= 20 ? 3 : level >= 12 ? 2 : level >= 8 ? 1 : 0;
}
export function limitLevel(
  request: number,
  current: number,
  remaining: number,
  stigma = false,
) {
  return Math.max(
    0,
    Math.min(
      stigma ? 20 : 10,
      Math.floor(request),
      current + Math.max(0, remaining),
    ),
  );
}
export function craft(
  recipe: Recipe,
  amount: number,
  recipes: Recipe[],
  recursive: boolean,
  variants: Record<string, number> = {},
) {
  const materials = new Map<
    number,
    { id: number; name: string; qty: number }
  >();
  let fee = 0;
  const warnings = new Set<string>();
  const add = (id: number, name: string, qty: number) =>
    materials.set(id, { id, name, qty: (materials.get(id)?.qty || 0) + qty });
  function visit(
    r: Recipe,
    quantity: number,
    target: number,
    path: Set<number>,
  ) {
    const output = r.outputs.find((o) => o.id === target) || r.outputs[0];
    const batches = Math.ceil(quantity / Math.max(1, output.qty));
    const raw = r.goldCost?.replaceAll(",", "") || "0";
    if (/^\d+(\.\d+)?$/.test(raw)) fee += Number(raw) * batches;
    else warnings.add("A recipe fee is unavailable in the snapshot.");
    const next = new Set(path).add(r.id);
    for (const m of r.inputs) {
      const qty = m.qty * batches;
      const choices = recipes.filter(
        (x) =>
          x.outputs.some((o) => o.id === m.id) &&
          x.qualificationRace === r.qualificationRace,
      );
      const child = choices.find((x) => x.id === variants[m.id]) || choices[0];
      if (recursive && child && !next.has(child.id))
        visit(child, qty, m.id, next);
      else {
        add(m.id, m.name, qty);
        if (recursive && child && next.has(child.id))
          warnings.add(
            "Recipe cycle stopped; cyclic material must be purchased.",
          );
      }
    }
  }
  visit(recipe, Math.max(1, amount), recipe.outputs[0].id, new Set());
  return { materials: [...materials.values()], fee, warnings: [...warnings] };
}
export function route(
  nodes: Node[],
  active: string[],
  target: string,
  level = 45,
) {
  const valid = nodes.filter((n) => n.g !== "empty" && n.lvl <= level);
  const starts = valid.filter((n) => n.g === "start" || active.includes(n.id));
  const distances = new Map(starts.map((n) => [n.id, 0]));
  const paths = new Map(starts.map((n) => [n.id, [n.id]]));
  const queue = [...valid];
  while (queue.length) {
    queue.sort(
      (a, b) =>
        (distances.get(a.id) ?? Infinity) - (distances.get(b.id) ?? Infinity),
    );
    const n = queue.shift()!;
    if (!distances.has(n.id)) break;
    if (n.id === target) return paths.get(n.id)!;
    for (const next of queue.filter(
      (x) => Math.abs(x.r - n.r) + Math.abs(x.c - n.c) === 1,
    )) {
      const d =
        distances.get(n.id)! + (active.includes(next.id) ? 0 : next.cost);
      if (d < (distances.get(next.id) ?? Infinity)) {
        distances.set(next.id, d);
        paths.set(next.id, [...paths.get(n.id)!, next.id]);
      }
    }
  }
  return [];
}
export function connected(nodes: Node[], selected: string[]) {
  const result = new Set(nodes.filter((n) => n.g === "start").map((n) => n.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of nodes)
      if (
        n.g !== "empty" &&
        selected.includes(n.id) &&
        !result.has(n.id) &&
        nodes.some(
          (x) =>
            result.has(x.id) && Math.abs(x.r - n.r) + Math.abs(x.c - n.c) === 1,
        )
      ) {
        result.add(n.id);
        changed = true;
      }
  }
  return [...result];
}
export const cardTypes = ["Chalice", "Parchment", "Compass", "Bell", "Mirror"];
export const budgets: Record<string, number> = {
  Rare: 3,
  Legend: 4,
  Unique: 5,
};
export function eligible(type: string, pool: Roll[]) {
  return pool.filter(
    (s) =>
      type === "Chalice" ||
      s.type === (["Bell", "Mirror"].includes(type) ? "passive" : "active"),
  );
}
export function validCard(card: Card, pool: Roll[]) {
  return (
    ["Vigor", "Magic"].includes(card.theme) &&
    card.grade in budgets &&
    card.rolls.length <= 4 &&
    new Set(card.rolls.map((r) => r.id)).size === card.rolls.length &&
    card.rolls.every(
      (r) =>
        pool.some((s) => s.id === r.id) &&
        Number.isInteger(r.level) &&
        r.level >= 1 &&
        r.level <= 4,
    ) &&
    card.rolls.reduce((n, r) => n + r.level - 1, 0) <= budgets[card.grade]
  );
}
export function bestCards(
  pools: Record<string, Roll[]>,
  wishes: Record<string, number>,
  priority: string[],
) {
  let best: Record<string, Card> = {};
  let score = -1;
  function permute(types: string[], done: string[] = []) {
    if (types.length) {
      types.forEach((t) =>
        permute(
          types.filter((x) => x !== t),
          [...done, t],
        ),
      );
      return;
    }
    const covered: Record<string, number> = {};
    const result: Record<string, Card> = {};
    const rank = (id: string) =>
      priority.includes(id) ? priority.indexOf(id) : 999;
    for (const type of done) {
      const pool = eligible(type, pools[type] || []);
      const need = (id: string) =>
        Math.max(0, (wishes[id] || 0) - (covered[id] || 0));
      const ids = pool
        .map((s) => s.id)
        .sort(
          (a, b) =>
            need(b) - need(a) || rank(a) - rank(b) || a.localeCompare(b),
        )
        .slice(0, 4);
      const rolls = ids.map((id) => ({ id, level: 1 }));
      for (let i = 0; i < 5; i++) {
        const choices = rolls
          .filter((r) => r.level < 4)
          .sort(
            (a, b) =>
              Math.max(0, need(b.id) - b.level) -
                Math.max(0, need(a.id) - a.level) ||
              rank(a.id) - rank(b.id) ||
              a.id.localeCompare(b.id),
          );
        if (choices[0]) choices[0].level++;
      }
      for (const r of rolls) covered[r.id] = (covered[r.id] || 0) + r.level;
      result[type] = { theme: "Vigor", grade: "Unique", rolls };
    }
    const value = Object.entries(wishes).reduce(
      (n, [id, v]) => n + Math.min(v, covered[id] || 0),
      0,
    );
    if (value > score) {
      score = value;
      best = result;
    }
  }
  permute(cardTypes);
  return {
    cards: best,
    covered: score,
    total: Object.values(wishes).reduce((a, b) => a + b, 0),
  };
}
export function enchant(
  item: Item,
  level: number,
  cap: number,
): Record<string, number> {
  const l = Math.min(level, cap),
    ex = Math.max(0, level - cap);
  const armor = [
      "Helm",
      "Top",
      "Pauldrons",
      "Gloves",
      "Legs",
      "Shoes",
      "Cloak",
      "Belt",
    ].includes(item.categoryName),
    accessory = [
      "Necklace",
      "Earrings",
      "Ring",
      "Bracelet",
      "Brooch",
      "Amulet",
    ].includes(item.categoryName);
  if (armor)
    return {
      Defense:
        l *
          (item.categoryName === "Belt"
            ? 30
            : item.grade === "Epic"
              ? 35
              : 30) +
        80 * ex,
      HP: l * (item.categoryName === "Belt" ? 50 : 20) + 80 * ex,
      "Defense increase %": ex,
      "HP increase %": ex,
    };
  return {
    Attack:
      (accessory
        ? 5 * l
        : item.grade === "Epic"
          ? 17.5 * l
          : item.grade === "Unique"
            ? 5.733 * l ** 1.355
            : 10 * l) +
      (accessory ? 20 : 30) * ex,
    "Attack increase %": ex,
    ...(accessory ? { Defense: 40 * ex } : {}),
  };
}
export function stats(items: Item[]) {
  const result: Record<string, number> = {};
  for (const item of items)
    for (const line of item.options || []) {
      const m = line.match(/^(.+?)\s+(-?[\d,.]+)(?:\s*~\s*([\d,.]+))?(%)?$/);
      if (m) {
        const key = m[1] + (m[4] ? " %" : "");
        const a = Number(m[2].replaceAll(",", ""));
        result[key] =
          (result[key] || 0) +
          (m[3] ? (a + Number(m[3].replaceAll(",", ""))) / 2 : a);
      }
    }
  return result;
}
