import type { ArmoryState, Build } from "./state";
import { freshBuild } from "./state";
import { type Item, slots, fits, classes, stats, enchant } from "./model";
import { useData, Loading, Select, NumberField } from "./shared";
type Wing = {
  id: string;
  name: string;
  race: string;
  levels: { level: number; stats: Record<string, number> }[];
};
export default function Builds({
  state: s,
  onChange: set,
}: {
  state: ArmoryState;
  onChange: (s: ArmoryState) => void;
}) {
  const { data, error } = useData<{ items: Item[] }>("items_all"),
    w = useData<Wing[]>("wings_items"),
    ds = useData<Record<string, Record<string, unknown>>>("dungeon_sets"),
    p = useData<Record<string, string[]>>("stat_priority_options");
  if (!data) return <Loading error={error} />;
  const b = s.builds.find((b) => b.id === s.build) || s.builds[0];
  const update = (patch: Partial<Build>) =>
    set({
      ...s,
      builds: s.builds.map((x) => (x.id === b.id ? { ...b, ...patch } : x)),
    });
  const totals = (build: Build) => {
    const value = stats(
      Object.values(build.gear)
        .map((g) => data.items.find((i) => i.id === g.id))
        .filter((i): i is Item => !!i),
    );
    for (const g of Object.values(build.gear)) {
      const item = data.items.find((i) => i.id === g.id);
      if (item)
        for (const [k, v] of Object.entries(enchant(item, g.level, g.cap)))
          value[k] = (value[k] || 0) + (v || 0);
    }
    return value;
  };
  const total = totals(b),
    other = s.builds.find((x) => x.id === s.compareBuild);
  const sets = Object.values(ds.data || {}).flatMap((x) => Object.keys(x));
  const wing = w.data?.find((x) => x.id === b.wing);
  return (
    <>
      <div className="toolbar">
        <Select
          label="Saved loadout"
          value={b.id}
          options={s.builds.map((x) => [x.id, `${x.name} · ${x.className}`])}
          onChange={(build) => set({ ...s, build })}
        />
        <button
          onClick={() => {
            const build = freshBuild();
            set({ ...s, build: build.id, builds: [...s.builds, build] });
          }}
        >
          New loadout
        </button>
        <button
          onClick={() => {
            const copy = {
              ...b,
              id: crypto.randomUUID(),
              name: b.name + " copy",
            };
            set({ ...s, build: copy.id, builds: [...s.builds, copy] });
          }}
        >
          Duplicate
        </button>
        <button
          disabled={s.builds.length < 2}
          onClick={() =>
            set({
              ...s,
              builds: s.builds.filter((x) => x.id !== b.id),
              build: "",
            })
          }
        >
          Delete loadout
        </button>
      </div>
      <div className="panel toolbar">
        <label className="field">
          Loadout name
          <input
            value={b.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
        <Select
          label="Class"
          value={b.className}
          options={classes}
          onChange={(className) => update({ className, gear: {}, wing: "" })}
        />
        <Select
          label="Race"
          value={b.race}
          options={[
            ["light", "Elyos"],
            ["dark", "Asmodian"],
          ]}
          onChange={(race) => update({ race, gear: {}, wing: "" })}
        />
        <Select
          label="Quick equip set"
          value={s.set}
          options={["", ...sets]}
          onChange={(v) => set({ ...s, set: v })}
        />
        <button
          disabled={!s.set}
          onClick={() => {
            const gear = { ...b.gear };
            for (const slot of Object.keys(slots)) {
              const i = data.items.find(
                (i) =>
                  fits(i, slot, b.className, b.race) && i.name.includes(s.set),
              );
              if (i)
                gear[slot] = {
                  id: i.id,
                  level: 0,
                  cap:
                    i.categoryName === "Belt"
                      ? 10
                      : i.grade === "Epic"
                        ? 20
                        : 15,
                };
            }
            update({ gear });
          }}
        >
          Equip matching pieces
        </button>
      </div>
      <div className="armory-columns">
        <div className="panel">
          {Object.keys(slots).map((slot) => {
            const g = b.gear[slot];
            const item = data.items.find((i) => i.id === g?.id);
            return (
              <div className="armory-gear" key={slot}>
                <Select
                  label={slot}
                  value={String(g?.id || "")}
                  options={[
                    ["", "Empty"],
                    ...data.items
                      .filter((i) => fits(i, slot, b.className, b.race))
                      .map((i) => [String(i.id), i.name] as [string, string]),
                  ]}
                  onChange={(v) => {
                    const gear = { ...b.gear };
                    if (!v) delete gear[slot];
                    else {
                      const i = data.items.find((i) => i.id === Number(v))!;
                      gear[slot] = {
                        id: i.id,
                        level: 0,
                        cap:
                          i.categoryName === "Belt"
                            ? 10
                            : i.grade === "Epic"
                              ? 20
                              : 15,
                      };
                    }
                    update({ gear });
                  }}
                />
                {item && g && (
                  <>
                    <NumberField
                      label="Enchant"
                      value={g.level}
                      max={g.cap + 5}
                      onChange={(level) =>
                        update({ gear: { ...b.gear, [slot]: { ...g, level } } })
                      }
                    />
                    <NumberField
                      label="Normal cap"
                      value={g.cap}
                      min={1}
                      max={20}
                      onChange={(cap) =>
                        update({
                          gear: {
                            ...b.gear,
                            [slot]: {
                              ...g,
                              cap,
                              level: Math.min(g.level, cap + 5),
                            },
                          },
                        })
                      }
                    />
                    <details>
                      <summary>Properties</summary>
                      {item.options.map((o, i) => (
                        <p key={i}>{o}</p>
                      ))}
                    </details>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div>
          <article className="panel">
            <h2>Loadout properties</h2>
            <p className="muted">
              Catalog range midpoints plus upstream enchant estimates. Normal
              caps are inferred by grade; adjust for item exceptions. Detailed
              live item caps/stats are unavailable. Estimates are not combat
              damage predictions.
            </p>
            <Select
              label="Compare with"
              value={s.compareBuild}
              options={[
                ["", "None"],
                ...s.builds
                  .filter((x) => x.id !== b.id)
                  .map((x) => [x.id, x.name] as [string, string]),
              ]}
              onChange={(compareBuild) => set({ ...s, compareBuild })}
            />
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Current</th>
                  {other && <th>{other.name}</th>}
                </tr>
              </thead>
              <tbody>
                {[
                  ...new Set([
                    ...Object.keys(total),
                    ...Object.keys(other ? totals(other) : {}),
                  ]),
                ].map((k) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{(total[k] || 0).toFixed(1)}</td>
                    {other && <td>{(totals(other)[k] || 0).toFixed(1)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
          <article className="panel">
            <h3>Wings</h3>
            <Select
              label="Wings"
              value={b.wing}
              options={[
                ["", "None"],
                ...(w.data || [])
                  .filter((x) => x.race === b.race)
                  .map((x) => [x.id, x.name] as [string, string]),
              ]}
              onChange={(wing) => update({ wing, wingLevel: 0 })}
            />
            {wing && (
              <>
                <Select
                  label="Wing level"
                  value={String(b.wingLevel)}
                  options={wing.levels.map((x) => [
                    String(x.level),
                    String(x.level),
                  ])}
                  onChange={(v) => update({ wingLevel: Number(v) })}
                />
                {Object.entries(
                  wing.levels.find((x) => x.level === b.wingLevel)?.stats || {},
                ).map(([k, v]) => (
                  <p key={k}>
                    {k}: {v}
                  </p>
                ))}
                <p className="muted">
                  Raw game stat units, separate from catalog totals.
                </p>
              </>
            )}
          </article>
          <article className="panel">
            <h3>Preferred properties</h3>
            <p className="muted">
              Save your desired rolls; preferences do not add stats.
            </p>
            <div className="armory-chips">
              {[...new Set(Object.values(p.data || {}).flat())].map((prop) => (
                <button
                  key={prop}
                  aria-pressed={b.preferences.includes(prop)}
                  className={b.preferences.includes(prop) ? "selected" : ""}
                  onClick={() =>
                    update({
                      preferences: b.preferences.includes(prop)
                        ? b.preferences.filter((x) => x !== prop)
                        : [...b.preferences, prop],
                    })
                  }
                >
                  {prop}
                </button>
              ))}
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
