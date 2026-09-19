import type { ArmoryState } from "./state";
import type { Item } from "./model";
import { classes, stats, classMatches } from "./model";
import { useData, Select, Loading } from "./shared";
export default function Items({
  state: s,
  onChange: set,
}: {
  state: ArmoryState;
  onChange: (s: ArmoryState) => void;
}) {
  const { data, error } = useData<{ items: Item[] }>("items_all");
  if (!data) return <Loading error={error} />;
  const items = data.items;
  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(s.query.toLowerCase()) &&
      (!s.category || i.categoryName === s.category) &&
      (!s.grade || i.grade === s.grade) &&
      (!s.className || classMatches(i, s.className)) &&
      (!s.mode || i.options.some((x) => x.includes(s.mode))),
  );
  const selected = items.find((i) => i.id === s.selected);
  const compared = items.filter((i) => s.comparison.includes(i.id));
  const update = (patch: Partial<ArmoryState>) =>
    set({ ...s, page: 0, ...patch });
  return (
    <>
      <div className="toolbar">
        <label className="field">
          Search items
          <input
            value={s.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Search the catalog"
          />
        </label>
        <Select
          label="Class"
          value={s.className}
          options={["", ...classes]}
          onChange={(className) => update({ className })}
        />
        <Select
          label="Category"
          value={s.category}
          options={["", ...new Set(items.map((i) => i.categoryName))].sort()}
          onChange={(category) => update({ category })}
        />
        <Select
          label="Grade"
          value={s.grade}
          options={["", ...new Set(items.map((i) => i.grade))]}
          onChange={(grade) => update({ grade })}
        />
        <Select
          label="Combat"
          value={s.mode}
          options={["", "PvE", "PvP"]}
          onChange={(mode) => update({ mode })}
        />
      </div>
      <p className="muted">
        {filtered.length.toLocaleString()} matching items · Release catalog
        snapshot. Detailed live stats are unavailable (shugo.gg HTTP 403).
      </p>
      <div className="armory-columns">
        <div className="panel">
          <div className="armory-list">
            {filtered.slice(s.page * 40, s.page * 40 + 40).map((i) => (
              <button
                key={i.id}
                className={
                  "armory-row " + (selected?.id === i.id ? "selected" : "")
                }
                onClick={() => set({ ...s, selected: i.id })}
              >
                <span>
                  <strong>{i.name}</strong>
                  <small>
                    {i.categoryName} · {i.grade}
                  </small>
                </span>
                <span>↗</span>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <p>No matching items. Clear a filter to see more.</p>
          )}
          <div className="toolbar">
            <button
              disabled={!s.page}
              onClick={() => set({ ...s, page: s.page - 1 })}
            >
              Previous
            </button>
            <span>Page {s.page + 1}</span>
            <button
              disabled={(s.page + 1) * 40 >= filtered.length}
              onClick={() => set({ ...s, page: s.page + 1 })}
            >
              Next
            </button>
          </div>
        </div>
        <article className="panel">
          {selected ? (
            <>
              <span className="badge">{selected.grade}</span>
              <h2>{selected.name}</h2>
              <p>
                {selected.categoryName} ·{" "}
                {selected.classNames.join(", ") || "All classes"} ·{" "}
                {selected.tradable ? "Tradable" : "Bound"}
              </p>
              <h3>Catalog properties</h3>
              <ul>
                {selected.options.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
              <button
                disabled={
                  !s.comparison.includes(selected.id) &&
                  s.comparison.length >= 3
                }
                onClick={() =>
                  set({
                    ...s,
                    comparison: s.comparison.includes(selected.id)
                      ? s.comparison.filter((id) => id !== selected.id)
                      : [...s.comparison, selected.id],
                  })
                }
              >
                {s.comparison.includes(selected.id)
                  ? "Remove comparison"
                  : "Compare item"}
              </button>
            </>
          ) : (
            <div className="empty-state">
              Select an item to inspect its catalog properties.
            </div>
          )}
        </article>
      </div>
      {compared.length > 0 && (
        <div className="panel table-wrap">
          <h3>Item comparison</h3>
          <table>
            <thead>
              <tr>
                <th>Property (range midpoint)</th>
                {compared.map((i) => (
                  <th key={i.id}>{i.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ...new Set(compared.flatMap((i) => Object.keys(stats([i])))),
              ].map((key) => (
                <tr key={key}>
                  <th>{key}</th>
                  {compared.map((i) => (
                    <td key={i.id}>{stats([i])[key] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
