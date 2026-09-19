import type { ArmoryState } from "./state";
import {
  type Skill,
  type Node,
  classes,
  monolith,
  limitLevel,
  specCap,
} from "./model";
import { useData, Loading, Select, NumberField, plain } from "./shared";
export default function Skills({
  state: s,
  onChange: set,
}: {
  state: ArmoryState;
  onChange: (s: ArmoryState) => void;
}) {
  const { data, error } = useData<{ skills: Skill[] }>("skills_all"),
    start = useData<{ nodes: Node[] }>("daevanion_boards_s"),
    advanced = useData<{ nodes: Node[] }>("daevanion_boards_a");
  if (!data) return <Loading error={error} />;
  const k = s.skills,
    update = (patch: Partial<typeof k>) =>
      set({ ...s, skills: { ...k, ...patch } });
  const skills = data.skills.filter(
    (x) => x.mainCategory === s.className.toLowerCase(),
  );
  const spent = skills
      .filter((x) => x.type !== "stigma")
      .reduce((n, x) => n + Math.min(10, k.levels[x.id] || 0), 0),
    stigma = skills
      .filter((x) => x.type === "stigma")
      .reduce((n, x) => n + (k.levels[x.id] || 0), 0),
    budget = 44 + monolith(k.monolith);
  const bonus = (id: string) => {
    let n = Object.values(s.arcana.cards)
      .flatMap((c) => c.rolls)
      .filter((r) => r.id === id)
      .reduce((n, r) => n + r.level, 0);
    for (const [key, ids] of Object.entries(s.board.selected)) {
      const nodes = key.startsWith("a:")
        ? advanced.data?.nodes
        : start.data?.nodes;
      for (const node of nodes || [])
        if (ids.includes(node.id))
          n += node.e
            .filter((e) => e.skill_id === id)
            .reduce((sum, e) => sum + e.v, 0);
    }
    return n;
  };
  return (
    <>
      <div className="toolbar">
        <Select
          label="Class"
          value={s.className}
          options={classes}
          onChange={(className) => set({ ...s, className })}
        />
        <label className="field">
          Search skills
          <input
            value={k.query}
            onChange={(e) => update({ query: e.target.value })}
          />
        </label>
        <NumberField
          label="Starting-zone Monolith level"
          value={k.monolith}
          max={30}
          min={1}
          onChange={(monolith) => update({ monolith })}
        />
        <NumberField
          label="Your Stigma point budget (0 = unknown)"
          value={k.stigmaBudget}
          onChange={(stigmaBudget) => update({ stigmaBudget })}
        />
      </div>
      <div className="toolbar">
        <span className="stat-card">
          Skill points: {spent} / {budget}
        </span>
        <span className="stat-card">
          Stigma points: {stigma}
          {k.stigmaBudget
            ? " / " + k.stigmaBudget
            : " · cap not known in source"}
        </span>
      </div>
      {spent > budget && (
        <p role="alert">
          This plan exceeds your current skill budget. Reduce levels or restore
          your Monolith level.
        </p>
      )}
      <p className="muted">
        Normal skill levels cap at 10; Stigma base levels cap at 20. Arcana and
        selected Daevanion skill bonuses are shown separately. Descriptions are
        static snapshot text and may retain upstream formula tokens.
      </p>
      <div className="armory-card-grid">
        {skills
          .filter((x) => x.name.toLowerCase().includes(k.query.toLowerCase()))
          .sort(
            (a, b) =>
              Number(k.favorites.includes(b.id)) -
              Number(k.favorites.includes(a.id)),
          )
          .map((skill) => {
            const level = k.levels[skill.id] || 0,
              extra = bonus(skill.id),
              effective = level + extra;
            const specs = k.specs[skill.id] || [];
            return (
              <article className="panel" key={skill.id}>
                <div className="toolbar">
                  <span className="badge">{skill.type}</span>
                  <button
                    aria-label={"Favorite " + skill.name}
                    aria-pressed={k.favorites.includes(skill.id)}
                    onClick={() =>
                      update({
                        favorites: k.favorites.includes(skill.id)
                          ? k.favorites.filter((x) => x !== skill.id)
                          : [...k.favorites, skill.id],
                      })
                    }
                  >
                    {k.favorites.includes(skill.id) ? "★" : "☆"}
                  </button>
                </div>
                <h3>{skill.name}</h3>
                <div className="toolbar">
                  <NumberField
                    label="Invested level"
                    value={level}
                    max={skill.type === "stigma" ? 20 : 10}
                    onChange={(v) => {
                      const next = limitLevel(
                        v,
                        level,
                        skill.type === "stigma"
                          ? k.stigmaBudget
                            ? k.stigmaBudget - stigma
                            : 20
                          : budget - spent,
                        skill.type === "stigma",
                      );
                      update({
                        levels: { ...k.levels, [skill.id]: next },
                        specs: {
                          ...k.specs,
                          [skill.id]: specs
                            .filter((id) =>
                              skill.specializations.some(
                                (x) =>
                                  x.id === id &&
                                  x.parentSkillLvl <= next + extra,
                              ),
                            )
                            .slice(0, specCap(next + extra)),
                        },
                      });
                    }}
                  />
                  <span className="badge">+{extra} equipment / board</span>
                </div>
                <button
                  onClick={() =>
                    update({
                      priority: k.priority.includes(skill.id)
                        ? k.priority.filter((x) => x !== skill.id)
                        : [...k.priority, skill.id],
                    })
                  }
                >
                  {k.priority.includes(skill.id)
                    ? `Priority ${k.priority.indexOf(skill.id) + 1} · remove`
                    : "Add to roll priority"}
                </button>
                <p>{plain(skill.description)}</p>
                {skill.specializations.length > 0 && (
                  <details>
                    <summary>
                      Specializations (
                      {skill.type === "stigma"
                        ? "automatic"
                        : `${specs.length}/${specCap(effective)} selected`}
                      )
                    </summary>
                    {skill.specializations.map((sp) => (
                      <label className="armory-check" key={sp.id}>
                        <input
                          type="checkbox"
                          checked={
                            skill.type === "stigma"
                              ? effective >= sp.parentSkillLvl
                              : specs.includes(sp.id)
                          }
                          disabled={
                            skill.type === "stigma" ||
                            effective < sp.parentSkillLvl ||
                            (!specs.includes(sp.id) &&
                              specs.length >= specCap(effective))
                          }
                          onChange={() =>
                            update({
                              specs: {
                                ...k.specs,
                                [skill.id]: specs.includes(sp.id)
                                  ? specs.filter((id) => id !== sp.id)
                                  : [...specs, sp.id],
                              },
                            })
                          }
                        />
                        Level {sp.parentSkillLvl}: {plain(sp.specialized)}
                      </label>
                    ))}
                  </details>
                )}
              </article>
            );
          })}
      </div>
    </>
  );
}
