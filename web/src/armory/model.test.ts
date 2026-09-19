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
