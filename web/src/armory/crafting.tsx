import type { ArmoryState } from "./state";
import { craft, type Recipe, type Item } from "./model";
import { useData, Loading, Select, NumberField } from "./shared";
import { ItemIcon } from "./icons";
export type Shopping = {
  title: string;
  amount: number;
  price?: number;
  location?: string;
};
export default function Crafting({
  state: s,
  onChange: set,
  onAddShopping,
}: {
  state: ArmoryState;
  onChange: (s: ArmoryState) => void;
  onAddShopping: (items: Shopping[]) => void;
}) {
  const { data, error } = useData<{ recipes: Recipe[] }>("recipes_all");
  const catalog = useData<{ items: Item[] }>("items_all");
  if (!data) return <Loading error={error} />;
  const items = new Map(catalog.data?.items.map((item) => [item.id, item]));
  const c = s.craft,
    update = (patch: Partial<typeof c>) =>
      set({ ...s, craft: { ...c, ...patch } });
  const recipes = data.recipes;
  const matches = recipes.filter((r) =>
    r.outputs.some((o) => o.name.toLowerCase().includes(c.query.toLowerCase())),
  );
  const recipe = recipes.find((r) => r.id === c.recipe);
  const result = recipe
    ? craft(recipe, c.amount, recipes, c.recursive, c.variants)
    : null;
  const variants = recipe
    ? recipes.filter((r) =>
        r.outputs.some((o) => o.id === recipe.outputs[0].id),
      )
    : [];
  const total = result
    ? result.fee +
      result.materials.reduce((n, m) => n + m.qty * (c.prices[m.id] || 0), 0)
    : 0;
  return (
    <>
      <div className="toolbar">
        <label className="field">
          Find a recipe
          <input
            value={c.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Item or material name"
          />
        </label>
        <NumberField
          label="Output quantity"
          value={c.amount}
          min={1}
          onChange={(amount) => update({ amount })}
        />
        <label>
          <input
            type="checkbox"
            checked={c.recursive}
            onChange={(e) => update({ recursive: e.target.checked })}
          />{" "}
          Expand crafted ingredients
        </label>
      </div>
      <div className="armory-columns">
        <div className="panel armory-list">
          {matches.slice(0, 150).map((r) => (
            <button
              className={"armory-row " + (r.id === c.recipe ? "selected" : "")}
              key={r.id}
              onClick={() => update({ recipe: r.id })}
            >
              <ItemIcon item={items.get(r.outputs[0].id)} />
              <span className="armory-row-copy">
                <strong>{r.outputs.map((o) => o.name).join(", ")}</strong>
                <small>
                  {r.mainCategory} ·{" "}
                  {r.qualificationRace === "dark" ? "Asmodian" : "Elyos"} ·
                  Recipe {r.id}
                </small>
              </span>
            </button>
          ))}
          {matches.length > 150 && (
            <p className="muted">Showing 150 recipes. Refine your search.</p>
          )}
        </div>
        <div className="panel">
          {recipe && result ? (
            <>
              <div className="armory-identity">
                <ItemIcon item={items.get(recipe.outputs[0].id)} size="large" />
                <h2>{recipe.outputs[0].name}</h2>
              </div>
              <Select
                label="Recipe variant (direct / transfer)"
                value={String(recipe.id)}
                options={variants.map((r) => [
                  String(r.id),
                  `${r.id} · ${r.qualificationRace} · ${r.inputs
                    .slice(0, 2)
                    .map((i) => i.name)
                    .join(" + ")}`,
                ])}
                onChange={(v) => update({ recipe: Number(v) })}
              />
              <p>
                Produces {recipe.outputs[0].qty} per batch. Fee total:{" "}
                {result.fee.toLocaleString()} Kina.
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Unit price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.materials.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <span className="armory-identity">
                            <ItemIcon item={items.get(m.id)} size="small" />
                            {m.name}
                          </span>
                        </td>
                        <td>{m.qty.toLocaleString()}</td>
                        <td>
                          <input
                            aria-label={m.name + " unit price"}
                            type="number"
                            min={0}
                            value={c.prices[m.id] ?? ""}
                            placeholder="Unknown"
                            onChange={(e) =>
                              update({
                                prices: {
                                  ...c.prices,
                                  [m.id]: Math.max(0, Number(e.target.value)),
                                },
                              })
                            }
                          />
                        </td>
                        <td>
                          {(m.qty * (c.prices[m.id] || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h3>{total.toLocaleString()} Kina estimated total</h3>
              <p className="muted">
                Unpriced materials count as zero; enter prices for a complete
                estimate. Remote fees are not included: the upstream snapshot
                contains inconsistent remote fee values.
              </p>
              {result.warnings.map((w) => (
                <p role="status" key={w}>
                  {w}
                </p>
              ))}
              <button
                className="primary"
                onClick={() =>
                  onAddShopping(
                    result.materials.map((m) => ({
                      title: m.name,
                      amount: m.qty,
                      price: c.prices[m.id],
                      location: "Crafting",
                    })),
                  )
                }
              >
                Add materials to shopping
              </button>
              <details>
                <summary>Intermediate recipe choices</summary>
                {recipes
                  .filter((r) =>
                    r.outputs.some((o) =>
                      recipe.inputs.some((i) => i.id === o.id),
                    ),
                  )
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() =>
                        update({
                          variants: { ...c.variants, [r.outputs[0].id]: r.id },
                        })
                      }
                    >
                      {c.variants[r.outputs[0].id] === r.id ? "✓ " : ""}
                      {r.outputs[0].name} — {r.id}
                    </button>
                  ))}
              </details>
            </>
          ) : (
            <div className="empty-state">
              Choose a recipe to calculate its full material tree.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
