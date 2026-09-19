import { useState } from "react";
import type { ArmoryState } from "./state";
import {
  type Node,
  type Skill,
  classes,
  route,
  connected,
  validateBoard,
} from "./model";
import { useData, Loading, Select, NumberField } from "./shared";
type Board = { id: string; name: string; classId: string };
export default function Daevanion({
  state: s,
  onChange: set,
}: {
  state: ArmoryState;
  onChange: (s: ArmoryState) => void;
}) {
  const b = s.board,
    { data, error } = useData<{ boards: Board[]; nodes: Node[] }>(
      "daevanion_boards_" + b.dataset,
    ),
    skills = useData<{ skills: Skill[] }>("skills_all");
  const [message, msg] = useState("");
  if (!data) return <Loading error={error} />;
  const boards = data.boards.filter(
      (x) => x.classId === s.className.toLowerCase(),
    ),
    board = boards.find((x) => x.id === b.board) || boards[0];
  const nodes = data.nodes.filter((n) => n.b === board?.id);
  const key = b.dataset + ":" + board?.id;
  const saved = b.selected[key] || [];
  const validation = validateBoard(nodes, saved, b.level, b.budget);
  const { active, cost } = validation;
  const focus = nodes.find((n) => n.id === b.focus);
  const update = (patch: Partial<typeof b>) =>
    set({ ...s, board: { ...b, ...patch } });
  const bonuses: Record<string, number> = {};
  for (const n of nodes.filter((n) => active.includes(n.id)))
    for (const e of n.e) {
      const name =
        e.t === "k"
          ? skills.data?.skills.find((x) => x.id === e.skill_id)?.name ||
            e.skill_id ||
            "Skill"
          : e.n || n.name;
      bonuses[name] = (bonuses[name] || 0) + e.v;
    }
  function choose(n: Node) {
    update({ focus: n.id });
    msg("");
  }
  function toggle(n: Node) {
    if (saved.includes(n.id)) {
      const selected = connected(
        nodes,
        saved.filter((id) => id !== n.id),
      );
      update({ selected: { ...b.selected, [key]: selected } });
      msg("Removed node and any disconnected branches.");
      return;
    }
    const path = route(nodes, active, n.id, b.level);
    if (!path.length) {
      msg("No connected path at your level. Empty cells cannot connect nodes.");
      return;
    }
    const selected = [...new Set([...active, ...path])];
    const total = nodes
      .filter((x) => selected.includes(x.id))
      .reduce((a, x) => a + x.cost, 0);
    if (total > b.budget) {
      msg(
        `Path needs ${total - cost} points; ${Math.max(0, b.budget - cost)} remain.`,
      );
      return;
    }
    update({ selected: { ...b.selected, [key]: selected } });
    msg(`Connected path added (${total - cost} points).`);
  }
  return (
    <>
      <div className="toolbar">
        <Select
          label="Class"
          value={s.className}
          options={classes}
          onChange={(className) => set({ ...s, className })}
        />
        <Select
          label="Board dataset"
          value={b.dataset}
          options={[
            ["s", "Start boards"],
            ["a", "Advanced boards"],
          ]}
          onChange={(dataset) => update({ dataset, board: "", focus: "" })}
        />
        <Select
          label="Deity"
          value={board?.id || ""}
          options={boards.map((x) => [x.id, x.name])}
          onChange={(board) => update({ board, focus: "" })}
        />
        <NumberField
          label="Character level"
          value={b.level}
          max={45}
          min={1}
          onChange={(level) => update({ level })}
        />
        <NumberField
          label="Available board points"
          value={b.budget}
          onChange={(budget) => update({ budget })}
        />
      </div>
      <p className="muted">
        {cost} / {b.budget} points used on this board. Select a node, then route
        through the lowest-cost connected path. Only orthogonally adjacent
        non-empty nodes connect.
      </p>
      {validation.overBudget && (
        <p role="alert">
          This board is over budget. Its bonuses are inactive until points or
          selections are corrected.
        </p>
      )}
      {validation.invalid.length > 0 && (
        <p role="alert">
          {validation.invalid.length} saved nodes are level-locked, disconnected
          or unavailable. Their effects are excluded. Select a saved node to
          remove its branch, or reset this board.
        </p>
      )}
      {!board ? (
        <p>
          No {b.dataset === "s" ? "start" : "advanced"} boards in this snapshot
          for {s.className}.
        </p>
      ) : (
        <div className="armory-columns">
          <div className="panel armory-board-scroll">
            <div className="armory-board">
              {nodes
                .filter((n) => n.g !== "empty")
                .map((n) => (
                  <button
                    key={n.id}
                    className={
                      "armory-node " +
                      (saved.includes(n.id) || n.g === "start"
                        ? "selected "
                        : "") +
                      (n.id === b.focus ? "focused" : "")
                    }
                    style={{ gridRow: n.r, gridColumn: n.c }}
                    title={`${n.name || "Start"} · ${n.cost} points · Level ${n.lvl}`}
                    aria-label={`${n.name || "Start"}, row ${n.r}, column ${n.c}, ${active.includes(n.id) ? "active" : "inactive"}`}
                    onClick={() => choose(n)}
                  >
                    {n.g === "start"
                      ? "◆"
                      : n.e.some((e) => e.t === "k")
                        ? "✦"
                        : n.cost}
                  </button>
                ))}
            </div>
          </div>
          <article className="panel">
            <h2>{focus?.name || "Choose a board node"}</h2>
            {focus && (
              <>
                <p>
                  {focus.g} · Level {focus.lvl} · {focus.cost} points
                </p>
                {focus.e.map((e, i) => (
                  <p key={i}>
                    {e.n ||
                      skills.data?.skills.find((x) => x.id === e.skill_id)
                        ?.name ||
                      e.skill_id}
                    : +{e.v}
                  </p>
                ))}
                <button
                  disabled={focus.g === "start"}
                  className="primary"
                  onClick={() => toggle(focus)}
                >
                  {saved.includes(focus.id)
                    ? "Remove branch"
                    : "Add connected path"}
                </button>
              </>
            )}
            <p role="status">{message}</p>
            <h3>Selected bonuses</h3>
            <p className="muted">
              Raw game stat units; skill values are added skill levels.
            </p>
            {Object.entries(bonuses).map(([k, v]) => (
              <p key={k}>
                {k}: +{v}
              </p>
            ))}
            <button
              onClick={() => update({ selected: { ...b.selected, [key]: [] } })}
            >
              Reset this board
            </button>
          </article>
        </div>
      )}
    </>
  );
}
