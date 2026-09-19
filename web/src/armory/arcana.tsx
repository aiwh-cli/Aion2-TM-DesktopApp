import { useState } from "react";
import type { ArmoryState } from "./state";
import {
  type Roll,
  type Card,
  cardTypes,
  budgets,
  validCard,
  bestCards,
  classes,
  classPools,
} from "./model";
import { useData, Loading, Select, NumberField } from "./shared";
type ArcanaItem = {
  id: number;
  name: string;
  cardType: string;
  theme: string;
  grade: string;
  empyreanLord: string;
  deity: string;
  skillLevels: number;
};
type Pools = Record<string, Record<string, Record<string, Roll[]>>>;
export default function Arcana({
  state: s,
  onChange: set,
}: {
  state: ArmoryState;
  onChange: (s: ArmoryState) => void;
}) {
  const { data, error } = useData<{ arcana: ArcanaItem[] }>("arcana_info"),
    raw = useData<Pools>("arcana_class_skills");
  const [result, setResult] = useState<ReturnType<typeof bestCards>>();
  if (!data || !raw.data) return <Loading error={error || raw.error} />;
  const a = s.arcana;
  const pools = classPools(raw.data, s.className);
  const all = [
    ...new Map(
      Object.values(pools)
        .flat()
        .map((x) => [x.id, x]),
    ).values(),
  ];
  const updateCard = (type: string, card: Card) =>
    set({ ...s, arcana: { ...a, cards: { ...a.cards, [type]: card } } });
  return (
    <>
      <div className="toolbar">
        <Select
          label="Class"
          value={s.className}
          options={classes}
          onChange={(className) => {
            set({ ...s, className });
            setResult(undefined);
          }}
        />
      </div>
      <p className="muted">
        Vigor / Magic release snapshots · Five type-specific equipped cards.
        Four distinct skill rolls per card; each starts at +1 and caps at +4.
        Extra levels share a grade budget: Rare 3, Legend 4, Unique 5.
      </p>
      <div className="armory-card-grid">
        {cardTypes.map((type) => {
          const card = a.cards[type] || {
            theme: "Vigor",
            grade: "Unique",
            rolls: [],
          };
          const pool = pools[type];
          const catalog =
            data.arcana.find(
              (i) =>
                i.cardType === type &&
                i.theme === card.theme &&
                i.grade === card.grade,
            ) ||
            data.arcana.find(
              (i) => i.cardType === type && i.theme === card.theme,
            );
          const valid = validCard(card, pool);
          const spent = card.rolls.reduce((n, r) => n + r.level - 1, 0);
          return (
            <article className="panel" key={type}>
              <h2>{type}</h2>
              <Select
                label={type + " theme"}
                value={card.theme}
                options={["Vigor", "Magic"]}
                onChange={(theme) => updateCard(type, { ...card, theme })}
              />
              <Select
                label={type + " grade"}
                value={card.grade}
                options={Object.keys(budgets)}
                onChange={(grade) => updateCard(type, { ...card, grade })}
              />
              <p>
                {catalog?.empyreanLord} · {catalog?.deity}
              </p>
              <p>
                {spent} / {budgets[card.grade] ?? 0} extra levels
              </p>
              {!valid && (
                <p role="alert">
                  This card exceeds its grade budget or contains rolls
                  unavailable to this class. Adjust or clear it.
                </p>
              )}
              {Array.from({ length: 4 }, (_, i) => {
                const roll = card.rolls[i];
                return (
                  <div className="armory-roll" key={i}>
                    <Select
                      label={`Skill roll ${i + 1}`}
                      value={roll?.id || ""}
                      options={[
                        ["", "Empty"],
                        ...pool
                          .filter(
                            (x) =>
                              !card.rolls.some(
                                (r, j) => r.id === x.id && j !== i,
                              ),
                          )
                          .map((x) => [x.id, x.name] as [string, string]),
                      ]}
                      onChange={(id) => {
                        const rolls = [...card.rolls];
                        if (id) rolls[i] = { id, level: 1 };
                        else rolls.splice(i, 1);
                        updateCard(type, {
                          ...card,
                          rolls: rolls.filter(Boolean),
                        });
                      }}
                    />
                    {roll && (
                      <NumberField
                        label="Bonus level"
                        value={roll.level}
                        min={1}
                        max={4}
                        onChange={(level) => {
                          const rolls = card.rolls.map((r, j) =>
                            i === j ? { ...r, level } : r,
                          );
                          const next = { ...card, rolls };
                          if (validCard(next, pool)) updateCard(type, next);
                        }}
                      />
                    )}
                  </div>
                );
              })}
              <button onClick={() => updateCard(type, { ...card, rolls: [] })}>
                Clear {type}
              </button>
            </article>
          );
        })}
      </div>
      <article className="panel">
        <h2>Best-case skill wishlist</h2>
        <p className="muted">
          Uses the upstream allocation rules across all 120 card-type orders.
          Assumes maxed Unique cards and perfect rolls. This is a target plan,
          not a drop probability or guaranteed result. Priority comes from the
          Skill Planner.
        </p>
        <div className="armory-card-grid">
          {all.map((skill) => (
            <NumberField
              key={skill.id}
              label={skill.name}
              value={a.wishes[skill.id] || 0}
              max={20}
              onChange={(v) => {
                set({
                  ...s,
                  arcana: { ...a, wishes: { ...a.wishes, [skill.id]: v } },
                });
                setResult(undefined);
              }}
            />
          ))}
        </div>
        <button
          className="primary"
          onClick={() =>
            setResult(
              bestCards(
                pools,
                Object.fromEntries(
                  Object.entries(a.wishes).filter(([id]) =>
                    all.some((skill) => skill.id === id),
                  ),
                ),
                s.skills.priority,
              ),
            )
          }
        >
          Calculate best-case cards
        </button>
        {result && (
          <div role="status">
            <h3>
              {result.covered} / {result.total} requested levels covered
            </h3>
            {Object.entries(result.cards).map(([type, card]) => (
              <p key={type}>
                <strong>{type}: </strong>
                {card.rolls
                  .map(
                    (r) =>
                      (all.find((x) => x.id === r.id)?.name || r.id) +
                      " +" +
                      r.level,
                  )
                  .join(", ")}
              </p>
            ))}
            <button
              onClick={() =>
                set({ ...s, arcana: { ...a, cards: result.cards } })
              }
            >
              Apply calculated cards
            </button>
          </div>
        )}
      </article>
      <details className="panel">
        <summary>
          Browse release Arcana catalog ({data.arcana.length} cards)
        </summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Card</th>
                <th>Theme</th>
                <th>Grade</th>
                <th>Lord</th>
              </tr>
            </thead>
            <tbody>
              {data.arcana.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>{i.theme}</td>
                  <td>{i.grade}</td>
                  <td>
                    {i.empyreanLord} / {i.deity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
