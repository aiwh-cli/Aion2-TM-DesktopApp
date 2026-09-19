import { useRef, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Download,
  Upload,
  Check,
  BookOpen,
  RotateCcw,
} from "lucide-react";
import {
  type Entry,
  type Profile,
  normalizeEntry,
  uid,
  csvExport,
  csvImport,
  download,
} from "../core";
import Modal from "./Modal";
export function EntryForm({
  entry,
  shopping,
  onSave,
  onClose,
}: {
  entry: Entry;
  shopping: boolean;
  onSave: (x: Entry) => void;
  onClose: () => void;
}) {
  const [x, set] = useState(entry);
  const patch = (p: Partial<Entry>) => set({ ...x, ...p });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (x.title.trim()) onSave({ ...x, title: x.title.trim() });
  };
  return (
    <Modal title={shopping ? "Shopping item" : "Task"} onClose={onClose}>
      <form onSubmit={submit} className="form-stack">
        <label className="field">
          {shopping ? "Item name" : "Task name"}
          <input
            autoFocus
            required
            maxLength={160}
            value={x.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <label className="field">
          Notes
          <textarea
            value={x.description}
            rows={3}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Schedule
            <select
              value={x.schedule}
              onChange={(e) =>
                patch({ schedule: e.target.value as Entry["schedule"] })
              }
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="event">Event</option>
              <option value="season">Season</option>
              <option value="once">One time</option>
            </select>
          </label>
          <label className="field">
            Priority
            <select
              value={x.priority}
              onChange={(e) =>
                patch({ priority: e.target.value as Entry["priority"] })
              }
            >
              <option value="high">High</option>
              <option value="middle">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label className="field">
            Character
            <input
              value={x.character}
              maxLength={80}
              placeholder="All characters"
              onChange={(e) => patch({ character: e.target.value })}
            />
          </label>
          <label className="field">
            Location
            <input
              value={x.location}
              maxLength={120}
              placeholder="Dungeon, merchant…"
              onChange={(e) => patch({ location: e.target.value })}
            />
          </label>
          {shopping && (
            <>
              <label className="field">
                Quantity
                <input
                  type="number"
                  min="0"
                  max="1000000000"
                  step="1"
                  value={x.amount}
                  onChange={(e) => patch({ amount: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                Unit price
                <input
                  type="number"
                  min="0"
                  max="1000000000000"
                  step="any"
                  value={x.price}
                  onChange={(e) => patch({ price: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                Currency
                <input
                  value={x.currency}
                  maxLength={40}
                  onChange={(e) => patch({ currency: e.target.value })}
                />
              </label>
              <div className="field">
                Total
                <strong className="form-total">
                  {(x.amount * x.price).toLocaleString()} {x.currency}
                </strong>
              </div>
            </>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            Save {shopping ? "item" : "task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default function Lists({
  kind,
  profile,
  update,
  notify,
}: {
  kind: "tasks" | "shopping";
  profile: Profile;
  update: (p: Profile) => void;
  notify: (s: string) => void;
}) {
  const shopping = kind === "shopping",
    all = profile.tasks[kind],
    templates = shopping ? profile.item_templates : profile.task_templates;
  const [search, setSearch] = useState(""),
    [schedule, setSchedule] = useState("all"),
    [status, setStatus] = useState("all"),
    [sort, setSort] = useState("priority"),
    [edit, setEdit] = useState<Entry | null>(null),
    [showTemplates, setShowTemplates] = useState(false),
    [confirm, setConfirm] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null),
    [templateSearch, setTemplateSearch] = useState("");
  const change = (rows: Entry[]) =>
    update({ ...profile, tasks: { ...profile.tasks, [kind]: rows } });
  const weights = { high: 0, middle: 1, low: 2 };
  const rows = all
    .filter(
      (x) =>
        (schedule === "all" || x.schedule === schedule) &&
        (status === "all" || (status === "done") === x.completed) &&
        `${x.title} ${x.character} ${x.location}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "price"
          ? b.amount * b.price - a.amount * a.price
          : Number(a.completed) - Number(b.completed) ||
            weights[a.priority] - weights[b.priority],
    );
  const total = all.length,
    done = all.filter((x) => x.completed).length;
  const currencies = Object.entries(
    all
      .filter((x) => !x.completed)
      .reduce(
        (sum, x) => ({
          ...sum,
          [x.currency]: (sum[x.currency] ?? 0) + x.amount * x.price,
        }),
        {} as Record<string, number>,
      ),
  );
  const importCSV = async (f: File) => {
    try {
      const entries = csvImport(await f.text());
      const existing = new Set(
        all.map((x) => `${x.title.toLowerCase()}|${x.schedule}|${x.character}`),
      );
      const unique = entries.filter((x) => {
        const key = `${x.title.toLowerCase()}|${x.schedule}|${x.character}`;
        if (existing.has(key)) return false;
        existing.add(key);
        return true;
      });
      change([...all, ...unique]);
      notify(
        `Imported ${unique.length} ${shopping ? "items" : "tasks"}; ${entries.length - unique.length} duplicates skipped.`,
      );
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <div className="page-content">
      <div className="summary-strip">
        <div>
          <span className="eyebrow">
            {shopping ? "Shopping progress" : "Your progress"}
          </span>
          <strong>
            {done}
            <span>
              {" "}
              / {total} {shopping ? "purchased" : "complete"}
            </span>
          </strong>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Completion"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={Math.max(total, 1)}
        >
          <i style={{ width: `${total ? (100 * done) / total : 0}%` }} />
        </div>
        {shopping && (
          <div className="total-inline">
            {currencies.length ? (
              currencies.map(([currency, n]) => (
                <span key={currency}>
                  {n.toLocaleString()} <small>{currency}</small>
                </span>
              ))
            ) : (
              <span>
                0 <small>kinah remaining</small>
              </span>
            )}
          </div>
        )}
      </div>
      <div className="toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label={`Search ${kind}`}
            placeholder={
              shopping
                ? "Search your shopping list…"
                : "Search tasks, characters, locations…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter schedule"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
        >
          <option value="all">All schedules</option>
          {["daily", "weekly", "event", "season", "once"].map((s) => (
            <option value={s} key={s}>
              {s === "once" ? "One time" : s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter completion"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="done">Completed</option>
        </select>
        <button
          className="button primary"
          onClick={() =>
            setEdit(
              normalizeEntry({
                title: "",
                schedule: schedule === "all" ? "daily" : schedule,
              }),
            )
          }
        >
          <Plus size={17} />
          Add {shopping ? "item" : "task"}
        </button>
      </div>
      <div className="list-options">
        <div className="button-group">
          <button
            className="text-button"
            onClick={() => setShowTemplates(true)}
          >
            <BookOpen size={15} />
            Templates
          </button>
          <button className="text-button" onClick={() => file.current?.click()}>
            <Upload size={15} />
            Import CSV
          </button>
          <button
            className="text-button"
            onClick={() =>
              download(
                `${profile.profile_name}-${kind}.csv`,
                csvExport(all),
                "text/csv",
              )
            }
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            className="text-button"
            disabled={!done}
            onClick={() => setConfirm("reset")}
          >
            <RotateCcw size={15} />
            Reset completed
          </button>
        </div>
        <label className="inline-label">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="priority">Priority</option>
            <option value="title">Name</option>
            {shopping && <option value="price">Total price</option>}
          </select>
        </label>
      </div>
      <input
        ref={file}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importCSV(f);
          e.target.value = "";
        }}
      />
      <div className="panel list-panel">
        {rows.length ? (
          rows.map((x) => (
            <div
              className={`entry-row ${x.completed ? "is-complete" : ""}`}
              key={x.id}
            >
              <button
                className={`check-button ${x.completed ? "checked" : ""}`}
                aria-label={`${x.completed ? "Reopen" : "Complete"} ${x.title}`}
                aria-pressed={x.completed}
                onClick={() =>
                  change(
                    all.map((item) =>
                      item.id === x.id
                        ? { ...item, completed: !item.completed }
                        : item,
                    ),
                  )
                }
              >
                {x.completed && <Check size={15} />}
              </button>
              <div className="entry-body">
                <div className="entry-title">
                  <strong>{x.title}</strong>
                  <span
                    className={`priority-dot ${x.priority}`}
                    title={`${x.priority === "middle" ? "medium" : x.priority} priority`}
                  />
                  {x.character && <span className="badge">{x.character}</span>}
                </div>
                {x.description && <p>{x.description}</p>}
                <div className="entry-meta">
                  <span>{x.schedule === "once" ? "One time" : x.schedule}</span>
                  {x.location && (
                    <>
                      <i /> <span>{x.location}</span>
                    </>
                  )}
                </div>
              </div>
              {shopping && (
                <div className="entry-price">
                  <strong>{(x.amount * x.price).toLocaleString()}</strong>
                  <span>
                    {x.amount.toLocaleString()} × {x.price.toLocaleString()}{" "}
                    {x.currency}
                  </span>
                </div>
              )}
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label={`Edit ${x.title}`}
                  onClick={() => setEdit(x)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Delete ${x.title}`}
                  onClick={() => setConfirm(x.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Check size={32} />
            <h3>
              {all.length
                ? "Nothing matches your filters"
                : shopping
                  ? "Plan your next purchase"
                  : "Make room for your next adventure"}
            </h3>
            <p>
              {all.length
                ? "Try a different search or schedule."
                : "Add your own entry or start with a game template."}
            </p>
          </div>
        )}
      </div>
      <p className="footnote">
        Daily and weekly entries reopen at the reset times in Settings. Event,
        season and one-time entries reset manually.
      </p>
      {edit && (
        <EntryForm
          key={edit.id}
          entry={edit}
          shopping={shopping}
          onClose={() => setEdit(null)}
          onSave={(x) => {
            change(
              all.some((a) => a.id === x.id)
                ? all.map((a) => (a.id === x.id ? x : a))
                : [...all, x],
            );
            setEdit(null);
          }}
        />
      )}
      {showTemplates && (
        <Modal
          title={`${shopping ? "Shopping" : "Task"} templates`}
          onClose={() => setShowTemplates(false)}
        >
          <div className="form-stack">
            <input
              aria-label="Search templates"
              placeholder="Find a template…"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
            />
            <div className="template-list">
              {templates
                .filter((t) =>
                  t.title.toLowerCase().includes(templateSearch.toLowerCase()),
                )
                .map((t) => (
                  <button
                    className="template-row"
                    key={t.id}
                    onClick={() => {
                      change([...all, { ...t, id: uid(), completed: false }]);
                      setShowTemplates(false);
                      notify(`Added ${t.title}.`);
                    }}
                  >
                    <div>
                      <strong>{t.title}</strong>
                      <small>
                        {t.schedule} · {t.location || "Any location"}
                      </small>
                    </div>
                    <Plus size={18} />
                  </button>
                ))}
            </div>
            <button
              className="button secondary"
              onClick={() => {
                const titleSet = new Set(templates.map((t) => t.title));
                const add = all
                  .filter((x) => !titleSet.has(x.title))
                  .map((x) => ({ ...x, id: uid(), completed: false }));
                update({
                  ...profile,
                  [shopping ? "item_templates" : "task_templates"]: [
                    ...templates,
                    ...add,
                  ],
                });
                notify(`Saved ${add.length} new templates.`);
              }}
            >
              Save current list as templates
            </button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            confirm === "reset"
              ? "Reset completed entries?"
              : "Delete this entry?"
          }
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm === "reset"
              ? "All completed entries in this list will become open again."
              : "This entry will be removed from this profile."}
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setConfirm(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                change(
                  confirm === "reset"
                    ? all.map((x) => ({ ...x, completed: false }))
                    : all.filter((x) => x.id !== confirm),
                );
                setConfirm(null);
              }}
            >
              {confirm === "reset" ? "Reset" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
