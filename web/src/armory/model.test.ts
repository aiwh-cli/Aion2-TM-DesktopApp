import { describe, it, expect } from "vitest";
import {
  craft,
  monolith,
  limitLevel,
  specCap,
  route,
  connected,
  validCard,
  bestCards,
  fits,
  enchant,
  type Recipe,
  type Node,
  type Item,
} from "./model";
import { normalizeArmoryState } from "./state";
const recipe = (
  id: number,
  input: number,
  qty: number,
  output: number,
  count = 1,
): Recipe => ({
  id,
  goldCost: "10",
  qualificationRace: "light",
  mainCategory: "alchemy",
  inputs: [{ id: input, name: "Material", qty }],
  outputs: [{ id: output, name: "Output", qty: count }],
});
const node = (
  id: string,
  r: number,
  c: number,
  g = "common",
  cost = 1,
): Node => ({ id, r, c, g, cost, b: "1", name: id, lvl: 0, e: [] });
describe("craft recursion", () => {
  it("rounds batches independently at every depth and aggregates fees", () => {
    const a = recipe(1, 20, 3, 10, 2),
      b = recipe(2, 30, 2, 20, 4);
    const result = craft(a, 3, [a, b], true);
    expect(result.materials).toEqual([{ id: 30, name: "Material", qty: 4 }]);
    expect(result.fee).toBe(40);
  });
  it("terminates cycles and retains a purchasable leaf", () => {
    const a = recipe(1, 20, 1, 10),
      b = recipe(2, 10, 1, 20);
    const result = craft(a, 1, [a, b], true);
    expect(result.materials[0].id).toBe(10);
    expect(result.warnings).toHaveLength(1);
  });
  it("honors a selected transfer variant", () => {
    const a = recipe(1, 20, 1, 10),
      b = recipe(2, 30, 2, 20),
      c = recipe(3, 40, 3, 20);
    expect(craft(a, 1, [a, b, c], true, { "20": 3 }).materials[0].id).toBe(40);
  });
});
describe("skill caps", () => {
  it("uses exact Monolith reward tiers", () => {
    expect(monolith(1)).toBe(0);
    expect(monolith(2)).toBe(1);
    expect(monolith(30)).toBe(112);
    expect(monolith(99)).toBe(112);
  });
  it("enforces per-skill and shared budgets", () => {
    expect(limitLevel(10, 8, 1)).toBe(9);
    expect(limitLevel(10, 8, 0)).toBe(8);
    expect(limitLevel(25, 0, 100, true)).toBe(20);
    expect(specCap(7)).toBe(0);
    expect(specCap(12)).toBe(2);
  });
});
describe("board routing", () => {
  it("cannot cross empty nodes or diagonals", () => {
    const nodes = [
      node("s", 1, 1, "start", 0),
      node("e", 1, 2, "empty", 0),
      node("t", 2, 2),
    ];
    expect(route(nodes, [], "t")).toEqual([]);
  });
  it("chooses the cheapest connected route", () => {
    const nodes = [
      node("s", 1, 1, "start", 0),
      node("a", 1, 2, "common", 5),
      node("b", 2, 1),
      node("c", 2, 2),
      node("t", 1, 3),
      node("d", 2, 3),
    ];
    expect(route(nodes, [], "t")).toEqual(["s", "b", "c", "d", "t"]);
  });
  it("removes disconnected descendants", () => {
    const nodes = [
      node("s", 1, 1, "start", 0),
      node("a", 1, 2),
      node("b", 1, 3),
    ];
    expect(connected(nodes, ["b"])).toEqual(["s"]);
  });
});
describe("Arcana constraints", () => {
  const pool = ["a", "b", "c", "d", "e"].map((id) => ({
    id,
    name: id,
    type: "active",
  }));
  it("rejects duplicate rolls, excess budgets and wrong class skills", () => {
    expect(
      validCard(
        {
          theme: "Vigor",
          grade: "Rare",
          rolls: [
            { id: "a", level: 4 },
            { id: "b", level: 2 },
          ],
        },
        pool,
      ),
    ).toBe(false);
    expect(
      validCard(
        {
          theme: "Vigor",
          grade: "Unique",
          rolls: [
            { id: "a", level: 1 },
            { id: "a", level: 1 },
          ],
        },
        pool,
      ),
    ).toBe(false);
    expect(
      validCard(
        { theme: "Magic", grade: "Unique", rolls: [{ id: "x", level: 1 }] },
        pool,
      ),
    ).toBe(false);
  });
  it("best-case solver fills real slots without exceeding five extra levels", () => {
    const pools = {
      Chalice: pool,
      Parchment: pool,
      Compass: pool,
      Bell: [],
      Mirror: [],
    };
    const result = bestCards(pools, { a: 8 }, []);
    expect(result.covered).toBe(8);
    for (const [t, c] of Object.entries(result.cards))
      expect(validCard(c, pools[t as keyof typeof pools])).toBe(true);
  });
});
describe("gear eligibility and estimates", () => {
  const i: Item = {
    id: 1,
    name: "Guardian Greatsword",
    grade: "Epic",
    categoryName: "Greatsword",
    classNames: ["Gladiator"],
    options: ["Attack 10 ~ 20"],
  };
  it("enforces slots, classes and racial gear", () => {
    expect(fits(i, "Weapon", "Gladiator")).toBe(true);
    expect(fits(i, "Ring", "Gladiator")).toBe(false);
    expect(fits(i, "Weapon", "Cleric")).toBe(false);
    expect(fits(i, "Weapon", "Gladiator", "dark")).toBe(false);
  });
  it("freezes normal enchant scaling and adds Exceed separately", () => {
    expect(enchant(i, 20, 20).Attack).toBe(350);
    expect(enchant(i, 21, 20).Attack).toBe(380);
    expect(enchant(i, 21, 20)["Attack increase %"]).toBe(1);
  });
});
it("normalizes hostile or malformed nested profile shapes", () => {
  const s = normalizeArmoryState({
    builds: [null, { gear: { Weapon: null } }],
    skills: { levels: { a: Infinity }, specs: { a: 1 } },
    arcana: { cards: { Chalice: { rolls: [null] } } },
    board: { selected: { x: null } },
  });
  expect(s.builds.length).toBe(2);
  expect(s.skills.levels).toEqual({});
  expect(s.board.selected.x).toEqual([]);
  expect(s.arcana.cards.Chalice.rolls).toEqual([{ id: "", level: 1 }]);
  expect(normalizeArmoryState(null).builds.length).toBe(1);
});

import { readFileSync } from "node:fs";
import {
  classMatches,
  normalizeNodes,
  classPools,
  arcanaBonuses,
  equippedEntries,
  validateBoard,
  boardSkillBonuses,
  validSpecs,
  type Skill,
  type ArcanaPools,
} from "./model";
const fixture = (name: string) =>
  JSON.parse(
    readFileSync(
      new URL("../../public/data/" + name + ".json", import.meta.url),
      "utf8",
    ),
  );
const realItems: Item[] = fixture("items_all").items;
const realSkills: Skill[] = fixture("skills_all").skills;
const startNodes: Node[] = normalizeNodes(fixture("daevanion_boards_s").nodes);
const advancedNodes: Node[] = normalizeNodes(
  fixture("daevanion_boards_a").nodes,
);
const realPools: ArcanaPools = fixture("arcana_class_skills");
describe("release fixture regressions", () => {
  it("maps Spiritmaster and Brawler catalog weapons to playable classes, including Gauntlets", () => {
    for (const [catalog, cls, categories] of [
      ["Spiritmaster", "Elementalist", ["Orb"]],
      ["Brawler", "Fighter", ["Fist", "Gauntlet"]],
    ] as const) {
      const items = realItems.filter((i) => i.classNames?.includes(catalog));
      expect(items.length).toBeGreaterThan(0);
      expect(
        normalizeArmoryState({
          className: catalog,
          builds: [{ className: catalog }],
        }).className,
      ).toBe(cls);
      expect(
        normalizeArmoryState({ builds: [{ className: catalog }] }).builds[0]
          .className,
      ).toBe(cls);
      for (const category of categories) {
        const item = items.find((i) => i.categoryName === category)!;
        expect(item).toBeDefined();
        expect(classMatches(item, cls)).toBe(true);
        expect(
          fits(
            item,
            "Weapon",
            cls,
            item.name.includes("Archon") ? "dark" : "light",
          ),
        ).toBe(true);
        expect(fits(item, "Weapon", "Cleric")).toBe(false);
      }
    }
  });
  it("normalizes numeric start skill IDs and string advanced IDs for effective bonuses", () => {
    for (const nodes of [startNodes, advancedNodes]) {
      const target =
        nodes === startNodes
          ? nodes.find((n) => n.id === "410037")!
          : nodes.find(
              (n) =>
                n.e.some((e) => e.t === "k") &&
                route(
                  nodes.filter((x) => x.b === n.b),
                  [],
                  n.id,
                ).length,
            )!;
      const board = nodes.filter((n) => n.b === target.b),
        path = route(board, [], target.id);
      expect(path).toContain(target.id);
      const effect = target.e.find((e) => e.t === "k")!;
      expect(typeof effect.skill_id).toBe("string");
      expect(realSkills.some((s) => s.id === effect.skill_id)).toBe(true);
      expect(
        boardSkillBonuses(board, path, 45, 10000).totals[effect.skill_id!],
      ).toBeGreaterThan(0);
    }
  });
  it("drops hidden import keys and excludes incompatible visible equipment from totals", () => {
    const item = realItems.find((i) => i.id === 110120001)!;
    const state = normalizeArmoryState({
      builds: [
        {
          gear: {
            Hidden: { id: item.id, level: 0, cap: 20 },
            Ring: { id: item.id, level: 0, cap: 20 },
            Weapon: { id: item.id, level: 0, cap: 20 },
          },
        },
      ],
      arcana: {
        cards: { Hidden: { theme: "Vigor", grade: "Unique", rolls: [] } },
      },
    });
    expect(state.builds[0].gear.Hidden).toBeUndefined();
    expect(state.arcana.cards.Hidden).toBeUndefined();
    expect(
      equippedEntries(
        state.builds[0].gear,
        realItems,
        "Gladiator",
        "light",
      ).map((g) => g.slot),
    ).toEqual(["Weapon"]);
    expect(
      equippedEntries(
        { Hidden: { id: item.id, level: 0, cap: 20 } },
        realItems,
        "Gladiator",
        "light",
      ),
    ).toEqual([]);
  });
  it("excludes hidden, duplicate, wrong-class and over-budget Arcana cards from bonuses", () => {
    const pools = classPools(realPools, "Gladiator"),
      id = pools.Chalice[0].id;
    const cards = {
      Hidden: { theme: "Vigor", grade: "Unique", rolls: [{ id, level: 4 }] },
      Chalice: {
        theme: "Vigor",
        grade: "Unique",
        rolls: [
          { id, level: 4 },
          { id, level: 4 },
        ],
      },
    };
    expect(arcanaBonuses(cards, pools).totals).toEqual({});
    const valid = {
      theme: "Vigor",
      grade: "Unique",
      rolls: [{ id, level: 4 }],
    };
    expect(arcanaBonuses({ Chalice: valid }, pools).totals[id]).toBe(4);
    expect(
      arcanaBonuses({ Chalice: valid }, classPools(realPools, "Cleric")).totals,
    ).toEqual({});
    expect(
      arcanaBonuses(
        {
          Chalice: {
            theme: "Vigor",
            grade: "Rare",
            rolls: [
              { id, level: 4 },
              { id: pools.Chalice[1].id, level: 2 },
            ],
          },
        },
        pools,
      ).totals,
    ).toEqual({});
  });
  it("deactivates level-locked, over-budget and disconnected real board effects after settings change", () => {
    const target = startNodes.find((n) => n.id === "410037")!,
      nodes = startNodes.filter((n) => n.b === target.b),
      path = route(nodes, [], target.id),
      skill = target.e.find((e) => e.t === "k")!.skill_id!;
    expect(
      boardSkillBonuses(nodes, path, 45, 10000).totals[skill],
    ).toBeGreaterThan(0);
    const lowered = boardSkillBonuses(nodes, path, 1, 10000);
    expect(lowered.invalid.length).toBeGreaterThan(0);
    expect(lowered.totals[skill]).toBeUndefined();
    const noPoints = boardSkillBonuses(nodes, path, 45, 0);
    expect(noPoints.overBudget).toBe(true);
    expect(noPoints.totals).toEqual({});
    const disconnected = nodes.find(
      (n) => n.e.some((e) => e.t === "k") && route(nodes, [], n.id).length > 2,
    )!;
    expect(
      validateBoard(nodes, [disconnected.id], 45, 10000).invalid,
    ).toContain(disconnected.id);
    expect(
      boardSkillBonuses(nodes, [disconnected.id], 45, 10000).totals,
    ).toEqual({});
  });
  it("deactivates saved specializations when only external bonus levels disappear", () => {
    const skill = realSkills.find(
      (s) =>
        s.type === "active" &&
        s.specializations.some((x) => x.parentSkillLvl > 10),
    )!;
    const spec = skill.specializations.find((x) => x.parentSkillLvl > 10)!;
    const saved = [spec.id];
    expect(
      validSpecs(skill, saved, Math.max(12, spec.parentSkillLvl)),
    ).toContain(spec.id);
    expect(validSpecs(skill, saved, 10)).toEqual([]);
    expect(saved).toEqual([spec.id]); // retained for removal/recovery, never active while locked
  });
});
