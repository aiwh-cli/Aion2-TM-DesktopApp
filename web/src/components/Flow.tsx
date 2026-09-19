import { useState, useRef, useEffect, type PointerEvent } from "react";
import {
  Plus,
  Trash2,
  GitBranch,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Pencil,
  ArrowRight,
} from "lucide-react";
import { type Profile, type FlowNode, uid, canConnect } from "../core";
import Modal from "./Modal";
export default function Flow({
  profile,
  update,
  notify,
}: {
  profile: Profile;
  update: (p: Profile) => void;
  notify: (s: string) => void;
}) {
  const name = profile.active_flow_map,
    map = profile.flow_maps[name],
    nodes = Object.values(map.nodes),
    [selected, setSelected] = useState<string | null>(null),
    [zoom, setZoom] = useState(0.8),
    [mode, setMode] = useState("edit"),
    [createMap, setCreateMap] = useState(false),
    [mapName, setMapName] = useState(""),
    [deleteMap, setDeleteMap] = useState(false),
    [remove, setRemove] = useState(false),
    [connect, setConnect] = useState("");
  const dragging = useRef<{
      id: string;
      x: number;
      y: number;
      startX: number;
      startY: number;
    } | null>(null),
    viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const all = Object.values(map.nodes);
    if (all.length)
      viewport.current?.scrollTo({
        left: Math.max(0, Math.min(...all.map((n) => n.x)) * zoom - 30),
        top: Math.max(0, Math.min(...all.map((n) => n.y)) * zoom - 30),
      });
  }, [name]);
  const active = selected ? map.nodes[selected] : null;
  const minX = Math.min(0, ...nodes.map((n) => n.x - 40)),
    minY = Math.min(0, ...nodes.map((n) => n.y - 40));
  const canvasWidth = Math.max(1300, ...nodes.map((n) => n.x + 300 - minX)),
    canvasHeight = Math.max(750, ...nodes.map((n) => n.y + 220 - minY));
  const change = (newNodes: Record<string, FlowNode>) =>
    update({
      ...profile,
      flow_maps: { ...profile.flow_maps, [name]: { ...map, nodes: newNodes } },
    });
  const patch = (id: string, p: Partial<FlowNode>) =>
    change({ ...map.nodes, [id]: { ...map.nodes[id], ...p } });
  const add = () => {
    const id = uid();
    const x = (viewport.current?.scrollLeft ?? 0) / zoom + 70,
      y = (viewport.current?.scrollTop ?? 0) / zoom + 70;
    change({
      ...map.nodes,
      [id]: {
        id,
        title: "New step",
        description: "",
        icon: "level",
        status: "locked",
        completed: false,
        x,
        y,
        children: [],
      },
    });
    setSelected(id);
  };
  const down = (e: PointerEvent<HTMLButtonElement>, n: FlowNode) => {
    if (mode !== "edit") return;
    setSelected(n.id);
    dragging.current = {
      id: n.id,
      x: e.clientX,
      y: e.clientY,
      startX: n.x,
      startY: n.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    const drag = dragging.current;
    if (drag)
      patch(drag.id, {
        x: Math.max(0, drag.startX + (e.clientX - drag.x) / zoom),
        y: Math.max(0, drag.startY + (e.clientY - drag.y) / zoom),
      });
  };
  const fit = () => {
    if (!nodes.length) return;
    const left = Math.min(...nodes.map((n) => n.x)),
      top = Math.min(...nodes.map((n) => n.y));
    change(
      Object.fromEntries(
        nodes.map((n) => [
          n.id,
          { ...n, x: n.x - left + 60, y: n.y - top + 60 },
        ]),
      ),
    );
    setZoom(0.8);
    viewport.current?.scrollTo(0, 0);
  };
  return (
    <div className="page-content">
      <div className="toolbar">
        <select
          aria-label="Active flow map"
          value={name}
          onChange={(e) => {
            update({ ...profile, active_flow_map: e.target.value });
            setSelected(null);
          }}
        >
          {Object.keys(profile.flow_maps).map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <button
          className="button secondary"
          onClick={() => {
            setMapName("");
            setCreateMap(true);
          }}
        >
          <Plus size={16} />
          New map
        </button>
        <button
          className="icon-button danger"
          disabled={Object.keys(profile.flow_maps).length < 2}
          aria-label="Delete map"
          onClick={() => setDeleteMap(true)}
        >
          <Trash2 size={17} />
        </button>
        <div className="segmented">
          <button
            className={mode === "edit" ? "selected" : ""}
            onClick={() => setMode("edit")}
          >
            <Pencil size={15} />
            Edit
          </button>
          <button
            className={mode === "guide" ? "selected" : ""}
            onClick={() => setMode("guide")}
          >
            <GitBranch size={15} />
            Guide
          </button>
        </div>
        <div className="toolbar-spacer" />
        <button className="button primary" onClick={add}>
          <Plus size={16} />
          Add step
        </button>
      </div>
      {mode === "guide" ? (
        <div className="guide-grid">
          {nodes
            .filter((n) => n.status !== "completed")
            .map((n) => (
              <article className="panel guide-step" key={n.id}>
                <span className={`badge ${n.status}`}>{n.status}</span>
                <h3>{n.title}</h3>
                <p>{n.description || "No notes for this step."}</p>
                {n.children.length > 0 && (
                  <p className="muted">
                    Next:{" "}
                    {n.children
                      .map((id) => map.nodes[id]?.title)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
                <button
                  className="button secondary"
                  onClick={() =>
                    patch(n.id, { status: "completed", completed: true })
                  }
                >
                  <Check size={16} />
                  Complete step
                </button>
              </article>
            ))}
          {nodes.every((n) => n.status === "completed") && (
            <div className="panel empty-state">
              <Check size={30} />
              <h3>
                {nodes.length
                  ? "Your path is complete"
                  : "Start planning your path"}
              </h3>
              <p>Add a step in edit mode to build your progression guide.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flow-layout">
          <div className="flow-frame">
            <div className="flow-viewport" ref={viewport}>
              <div
                className="flow-size"
                style={{
                  width: canvasWidth * zoom,
                  height: canvasHeight * zoom,
                }}
              >
                <div
                  className="flow-canvas"
                  style={{
                    width: canvasWidth,
                    height: canvasHeight,
                    transform: `scale(${zoom})`,
                  }}
                >
                  <svg
                    className="flow-lines"
                    width={canvasWidth}
                    height={canvasHeight}
                    aria-hidden="true"
                  >
                    <defs>
                      <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                      </marker>
                    </defs>
                    {nodes.flatMap((n) =>
                      n.children.map((id) => {
                        const c = map.nodes[id];
                        if (!c) return null;
                        const x1 = n.x - minX + 110,
                          y1 = n.y - minY + 108,
                          x2 = c.x - minX + 110,
                          y2 = c.y - minY;
                        return (
                          <path
                            key={`${n.id}-${id}`}
                            d={`M${x1} ${y1} C${x1} ${y1 + 65}, ${x2} ${y2 - 65}, ${x2} ${y2}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            markerEnd="url(#arrow)"
                          />
                        );
                      }),
                    )}
                  </svg>
                  {nodes.map((n) => (
                    <button
                      key={n.id}
                      className={`flow-node ${n.status} ${selected === n.id ? "node-selected" : ""}`}
                      style={{ left: n.x - minX, top: n.y - minY }}
                      onPointerDown={(e) => down(e, n)}
                      onPointerMove={move}
                      onPointerUp={() => {
                        dragging.current = null;
                      }}
                      onPointerCancel={() => {
                        dragging.current = null;
                      }}
                      onClick={() => setSelected(n.id)}
                      onKeyDown={(e) => {
                        const directions: Record<string, [number, number]> = {
                          ArrowLeft: [-20, 0],
                          ArrowRight: [20, 0],
                          ArrowUp: [0, -20],
                          ArrowDown: [0, 20],
                        };
                        const d = directions[e.key];
                        if (d) {
                          e.preventDefault();
                          patch(n.id, {
                            x: Math.max(0, n.x + d[0]),
                            y: Math.max(0, n.y + d[1]),
                          });
                        }
                      }}
                    >
                      <span className="flow-node-top">
                        <GitBranch size={15} />
                        {n.status}
                      </span>
                      <strong>{n.title}</strong>
                      <span>{n.description || "Add notes to this step"}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flow-tools">
              <button
                className="icon-button"
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
              >
                <ZoomOut size={17} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                className="icon-button"
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
              >
                <ZoomIn size={17} />
              </button>
              <button className="button secondary compact" onClick={fit}>
                <Maximize2 size={14} />
                Bring steps into view
              </button>
            </div>
          </div>
          <aside className="panel flow-editor">
            {active ? (
              <div className="form-stack">
                <div className="section-heading">
                  <h3>Edit step</h3>
                  <button
                    className="icon-button danger"
                    aria-label="Delete selected step"
                    onClick={() => setRemove(true)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <label className="field">
                  Step title
                  <input
                    value={active.title}
                    maxLength={160}
                    onChange={(e) =>
                      patch(active.id, { title: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  Notes
                  <textarea
                    rows={4}
                    value={active.description}
                    onChange={(e) =>
                      patch(active.id, { description: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  Status
                  <select
                    value={active.status}
                    onChange={(e) =>
                      patch(active.id, {
                        status: e.target.value,
                        completed: e.target.value === "completed",
                      })
                    }
                  >
                    {["locked", "active", "optional", "completed"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label className="field">
                    X position
                    <input
                      type="number"
                      min="0"
                      max="8000"
                      value={Math.round(active.x)}
                      onChange={(e) =>
                        patch(active.id, {
                          x: Math.max(0, Number(e.target.value)),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    Y position
                    <input
                      type="number"
                      min="0"
                      max="8000"
                      value={Math.round(active.y)}
                      onChange={(e) =>
                        patch(active.id, {
                          y: Math.max(0, Number(e.target.value)),
                        })
                      }
                    />
                  </label>
                </div>
                <label className="field">
                  Connect to next step
                  <select
                    value={connect}
                    onChange={(e) => setConnect(e.target.value)}
                  >
                    <option value="">Choose a step</option>
                    {nodes
                      .filter(
                        (n) =>
                          canConnect(map.nodes, active.id, n.id) &&
                          !active.children.includes(n.id),
                      )
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.title}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className="button secondary"
                  disabled={!connect}
                  onClick={() => {
                    if (canConnect(map.nodes, active.id, connect)) {
                      patch(active.id, {
                        children: [...new Set([...active.children, connect])],
                      });
                      setConnect("");
                    }
                  }}
                >
                  <ArrowRight size={16} />
                  Connect step
                </button>
                {active.children.map((id) => (
                  <div className="connection-row" key={id}>
                    <span>{map.nodes[id]?.title}</span>
                    <button
                      className="icon-button danger"
                      aria-label={`Disconnect ${map.nodes[id]?.title}`}
                      onClick={() =>
                        patch(active.id, {
                          children: active.children.filter((c) => c !== id),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <GitBranch size={28} />
                <h3>Your path, mapped out</h3>
                <p>
                  Select a step to edit it. Drag steps to arrange them, or use
                  arrow keys when a step is focused.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
      <p className="footnote">
        Each profile has its own maps. Guide mode shows unfinished steps in your
        progression.
      </p>
      {createMap && (
        <Modal title="New flow map" onClose={() => setCreateMap(false)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const n = mapName.trim();
              if (!n) return;
              if (profile.flow_maps[n]) {
                notify("A map already has that name.");
                return;
              }
              update({
                ...profile,
                flow_maps: { ...profile.flow_maps, [n]: { nodes: {} } },
                active_flow_map: n,
              });
              setSelected(null);
              setCreateMap(false);
            }}
          >
            <label className="field">
              Map name
              <input
                autoFocus
                required
                maxLength={80}
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
              />
            </label>
            <button className="button primary">Create map</button>
          </form>
        </Modal>
      )}
      {deleteMap && (
        <Modal title="Delete this map?" onClose={() => setDeleteMap(false)}>
          <p>All steps in “{name}” will be removed.</p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDeleteMap(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                const maps = { ...profile.flow_maps };
                delete maps[name];
                update({
                  ...profile,
                  flow_maps: maps,
                  active_flow_map: Object.keys(maps)[0],
                });
                setSelected(null);
                setDeleteMap(false);
              }}
            >
              Delete map
            </button>
          </div>
        </Modal>
      )}
      {remove && active && (
        <Modal title="Delete this step?" onClose={() => setRemove(false)}>
          <p>“{active.title}” and its connections will be removed.</p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setRemove(false)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                const remaining = Object.fromEntries(
                  nodes
                    .filter((n) => n.id !== active.id)
                    .map((n) => [
                      n.id,
                      {
                        ...n,
                        children: n.children.filter((c) => c !== active.id),
                      },
                    ]),
                );
                change(remaining);
                setSelected(null);
                setRemove(false);
              }}
            >
              Delete step
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
