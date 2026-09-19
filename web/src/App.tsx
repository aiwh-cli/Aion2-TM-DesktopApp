import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  Component,
  type ReactNode,
} from "react";
import {
  LayoutDashboard,
  ListChecks,
  ShoppingBag,
  Clock3,
  GitBranch,
  Shield,
  Swords,
  BookOpen,
  Sparkles,
  Hexagon,
  Settings2,
  ArrowUpRight,
  ChevronRight,
  Check,
  CheckCheck,
  Menu,
  X,
  Sun,
  CloudOff,
  Download,
} from "lucide-react";
import {
  type Profile,
  type Store,
  STORAGE_KEY,
  normalizeStore,
  normalizeProfile,
  normalizeEntry,
  applyResets,
  download,
} from "./core";
import Lists from "./components/Lists";
import Timers, { useNow, resetCards } from "./components/Timers";
import Flow from "./components/Flow";
import Settings from "./components/Settings";
import type { ArmoryTab } from "./armory";
import { normalizeArmoryState } from "./armory";
const Armory = lazy(() => import("./armory"));
type Page =
  | "dashboard"
  | "tasks"
  | "shopping"
  | "timers"
  | "flow"
  | "settings"
  | ArmoryTab;
const nav = [
  {
    id: "dashboard",
    name: "Overview",
    icon: LayoutDashboard,
    group: "YOUR ADVENTURE",
  },
  { id: "tasks", name: "Tasks", icon: ListChecks },
  { id: "shopping", name: "Shopping list", icon: ShoppingBag },
  { id: "timers", name: "Event timers", icon: Clock3 },
  { id: "flow", name: "Flow map", icon: GitBranch },
  { id: "items", name: "Item database", icon: Shield, group: "THE ARMORY" },
  { id: "crafting", name: "Crafting calculator", icon: Hexagon },
  { id: "builds", name: "Build planner", icon: Swords },
  { id: "skills", name: "Skill planner", icon: BookOpen },
  { id: "daevanion", name: "Daevanion boards", icon: Sun },
  { id: "arcana", name: "Arcana", icon: Sparkles },
  {
    id: "settings",
    name: "Settings & profiles",
    icon: Settings2,
    group: "PERSONALIZE",
  },
];
const descriptions: Record<Page, string> = {
  dashboard: "A clear path for your next adventure.",
  tasks: "Daily routines. Weekly ambitions. One place to keep track.",
  shopping: "Gather what you need for what comes next.",
  timers: "Know what’s next. Be there when it happens.",
  flow: "Turn your next goal into a path you can follow.",
  items: "Explore equipment, materials and possibilities.",
  crafting: "Trace every ingredient. Plan every Kinah.",
  builds: "Build your character, one considered choice at a time.",
  skills: "Choose your strengths. Make every point count.",
  daevanion: "Find your path through the divine.",
  arcana: "Discover the cards. Shape your next build.",
  settings: "Your profiles, your routine, your companion.",
};
export default function App() {
  const [store, setStore] = useState<Store | null>(null),
    [fatal, setFatal] = useState(""),
    [saveError, setSaveError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [page, setPage] = useState<Page>("dashboard"),
    [mobile, setMobile] = useState(false),
    [toast, setToast] = useState("");
  const notify = useCallback((s: string) => setToast(s), []);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        let initial: Store;
        if (saved) {
          initial = normalizeStore(JSON.parse(saved));
        } else {
          const r = await fetch("/data/default-profile.json");
          if (!r.ok)
            throw new Error(
              "Could not load the starter profile. Please reload.",
            );
          const profile = normalizeProfile(await r.json());
          profile.profile_name = "My adventure";
          initial = { version: 1, activeId: profile.id, profiles: [profile] };
        }
        if (alive) {
          setStore({
            ...initial,
            profiles: initial.profiles.map((p) => applyResets(p)),
          });
          setLoaded(true);
        }
      } catch (e) {
        if (alive) setFatal((e as Error).message);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded || !store) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      setSaveError("");
    } catch {
      setSaveError(
        "Your changes could not be saved in this browser. Export a backup now to keep them.",
      );
    }
  }, [store, loaded]);
  useEffect(() => {
    const id = setInterval(
      () =>
        setStore((s) => {
          if (!s) return s;
          const profiles = s.profiles.map((p) => applyResets(p));
          return profiles.some((p, i) => p !== s.profiles[i])
            ? { ...s, profiles }
            : s;
        }),
      15000,
    );
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(id);
  }, [toast]);
  const profile = store?.profiles.find((p) => p.id === store.activeId);
  const update = useCallback(
    (p: Profile) =>
      setStore((s) =>
        s
          ? { ...s, profiles: s.profiles.map((x) => (x.id === p.id ? p : x)) }
          : s,
      ),
    [],
  );
  const armory = useMemo(
    () => (profile ? normalizeArmoryState(profile.web_armory) : null),
    [profile?.id, profile?.web_armory],
  );
  const go = (next: Page) => {
    setPage(next);
    setMobile(false);
    window.scrollTo(0, 0);
  };
  if (fatal)
    return (
      <div className="recovery">
        <CloudOff size={40} />
        <h1>Your saved data needs attention.</h1>
        <p>{fatal}</p>
        <p>
          Keep a recovery copy before clearing browser storage. No saved data
          has been overwritten.
        </p>
        <button
          className="button primary"
          onClick={() => {
            try {
              download(
                "aion2-recovery.json",
                localStorage.getItem(STORAGE_KEY) || "{}",
              );
            } catch {
              setFatal(
                "Browser storage is unavailable. Allow storage for this site, then reload.",
              );
            }
          }}
        >
          <Download size={16} />
          Download recovery copy
        </button>
        <button className="button secondary" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!profile || !store || !armory)
    return (
      <div className="loading-screen">
        <div className="brand-symbol">A</div>
        <h1>Aion 2 Companion</h1>
        <p>Preparing your adventure…</p>
      </div>
    );
  const current = nav.find((n) => n.id === page)!;
  return (
    <div className={`app theme-${profile.theme}`}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <button
        className={`sidebar-scrim ${mobile ? "visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setMobile(false)}
      />
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("dashboard");
          }}
        >
          <div className="brand-symbol">
            A<span>Ⅱ</span>
          </div>
          <div>
            <strong>
              AION<span>2</span>
            </strong>
            <small>THE COMPANION</small>
          </div>
        </a>
        <button
          className="icon-button close-nav"
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <div key={n.id}>
              {n.group && <div className="nav-group">{n.group}</div>}
              <button
                className={`nav-item ${page === n.id ? "active" : ""}`}
                aria-current={page === n.id ? "page" : undefined}
                onClick={() => go(n.id as Page)}
              >
                <n.icon size={18} />
                <span>{n.name}</span>
                {n.id === "tasks" && (
                  <small>
                    {profile.tasks.tasks.filter((x) => !x.completed).length}
                  </small>
                )}
                {page === n.id && (
                  <ChevronRight className="nav-arrow" size={14} />
                )}
              </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>
            Browser edition<small>Based on desktop v2.0.7</small>
          </span>
          <a
            href="https://github.com/blacksole/Aion2-TM-DesktopApp"
            aria-label="Original Aion2 project"
            target="_blank"
            rel="noreferrer"
          >
            <ArrowUpRight size={17} />
          </a>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span>COMPANION</span>
            <ChevronRight size={13} />
            <strong>{current.name}</strong>
          </div>
          <div className="topbar-right">
            <span className={`save-indicator ${saveError ? "failed" : ""}`}>
              <span className="status-dot" />
              {saveError ? "Not saved" : "Saved on this device"}
            </span>
            <div className="profile-select">
              <span className="profile-avatar">
                {profile.profile_name.slice(0, 1).toUpperCase() || "A"}
              </span>
              <select
                aria-label="Current profile"
                value={store.activeId}
                onChange={(e) =>
                  setStore({ ...store, activeId: e.target.value })
                }
              >
                {store.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.profile_name || "Unnamed profile"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "dashboard"
                  ? "YOUR WORLD, IN ORDER"
                  : page === "settings"
                    ? "THE COMPANION"
                    : nav.find((n) => n.id === page)?.group === "THE ARMORY" ||
                        [
                          "crafting",
                          "builds",
                          "skills",
                          "daevanion",
                          "arcana",
                        ].includes(page)
                      ? "THE ARMORY"
                      : "YOUR ADVENTURE"}
              </div>
              <h1>
                {page === "dashboard" ? "Ready for what’s next." : current.name}
              </h1>
              <p>{descriptions[page]}</p>
            </div>
            {page === "dashboard" && (
              <span className="date-chip">
                {new Date().toLocaleDateString("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            )}
          </div>
          {saveError && (
            <div role="alert" className="alert error">
              {saveError}
              <button
                className="button secondary"
                onClick={() =>
                  download(
                    "aion2-emergency-backup.json",
                    JSON.stringify(store, null, 2),
                  )
                }
              >
                Export backup
              </button>
            </div>
          )}
          <ErrorBoundary key={profile.id + "-" + page}>
            {page === "dashboard" ? (
              <Dashboard profile={profile} update={update} go={go} />
            ) : page === "tasks" || page === "shopping" ? (
              <Lists
                key={profile.id + page}
                kind={page}
                profile={profile}
                update={update}
                notify={notify}
              />
            ) : page === "timers" ? (
              <Timers
                key={profile.id}
                profile={profile}
                update={update}
                notify={notify}
              />
            ) : page === "flow" ? (
              <Flow
                key={profile.id}
                profile={profile}
                update={update}
                notify={notify}
              />
            ) : page === "settings" ? (
              <Settings
                key={profile.id}
                store={store}
                profile={profile}
                update={update}
                setStore={setStore}
                notify={notify}
              />
            ) : (
              <Suspense
                fallback={
                  <div className="panel empty-state">Loading the Armory…</div>
                }
              >
                <Armory
                  key={profile.id}
                  tab={page}
                  state={armory}
                  onChange={(next) => update({ ...profile, web_armory: next })}
                  onAddShopping={(items) => {
                    update({
                      ...profile,
                      tasks: {
                        ...profile.tasks,
                        shopping: [
                          ...profile.tasks.shopping,
                          ...items.map((x) =>
                            normalizeEntry({
                              ...x,
                              schedule: "once",
                              location: x.location || "Crafting",
                            }),
                          ),
                        ],
                      },
                    });
                    notify(
                      `Added ${items.length} materials to your shopping list.`,
                    );
                  }}
                />
              </Suspense>
            )}
          </ErrorBoundary>
          <footer className="page-footer">
            <span>AION 2 COMPANION</span>
            <span>Inspired by the world. Built for your journey.</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
function Dashboard({
  profile,
  update,
  go,
}: {
  profile: Profile;
  update: (p: Profile) => void;
  go: (p: Page) => void;
}) {
  const now = useNow(),
    tasks = profile.tasks.tasks,
    done = tasks.filter((t) => t.completed).length,
    open = tasks
      .filter((t) => !t.completed)
      .sort(
        (a, b) =>
          ({ high: 0, middle: 1, low: 2 })[a.priority] -
          { high: 0, middle: 1, low: 2 }[b.priority],
      )
      .slice(0, 5),
    daily = tasks.filter((t) => t.schedule === "daily"),
    weekly = tasks.filter((t) => t.schedule === "weekly");
  return (
    <div className="page-content">
      <section className="overview-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            WELCOME BACK, {profile.profile_name.toUpperCase()}
          </span>
          <h2>
            A little progress.
            <br />
            <em>A greater adventure.</em>
          </h2>
          <p>
            Your goals, your gear, your next move.
            <br />
            Everything you need, together.
          </p>
          <button className="button primary" onClick={() => go("tasks")}>
            Plan your day
            <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <span className="hero-star">✦</span>
          <span className="art-label label-top">DAEVA’S JOURNEY</span>
          <span className="art-label label-bottom">EVERY STEP MATTERS</span>
          <i className="art-point point-a" />
          <i className="art-point point-b" />
          <i className="art-point point-c" />
        </div>
        <div className="hero-progress">
          <span className="eyebrow">TODAY’S MOMENTUM</span>
          <strong>
            {done}
            <span>/{tasks.length}</span>
          </strong>
          <span className="muted">tasks complete</span>
          <div className="progress-track">
            <i
              style={{
                width: `${tasks.length ? (100 * done) / tasks.length : 0}%`,
              }}
            />
          </div>
        </div>
      </section>
      <div className="overview-stats">
        {[
          {
            label: "Daily tasks",
            value: `${daily.filter((x) => x.completed).length} / ${daily.length}`,
            note: "One day at a time",
            icon: Sun,
            page: "tasks",
          },
          {
            label: "Weekly tasks",
            value: `${weekly.filter((x) => x.completed).length} / ${weekly.length}`,
            note: "Keep the bigger picture",
            icon: CheckCheck,
            page: "tasks",
          },
          {
            label: "Shopping list",
            value: profile.tasks.shopping.filter((x) => !x.completed).length,
            note: "Items left to gather",
            icon: ShoppingBag,
            page: "shopping",
          },
          {
            label: "Next daily reset",
            value: resetCards(profile, now)[0].value,
            note: `Device time · ${profile.settings.daily_reset_time}`,
            icon: Clock3,
            page: "timers",
          },
        ].map((s) => (
          <button
            className="stat-card"
            key={s.label}
            onClick={() => go(s.page as Page)}
          >
            <div>
              <span>{s.label}</span>
              <s.icon size={19} />
            </div>
            <strong>{s.value}</strong>
            <small>{s.note}</small>
          </button>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="panel dashboard-tasks">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A PLACE TO START</span>
              <h2>Up next</h2>
            </div>
            <button className="text-button" onClick={() => go("tasks")}>
              View all
              <ArrowUpRight size={16} />
            </button>
          </div>
          {open.length ? (
            open.map((t) => (
              <div className="entry-row" key={t.id}>
                <button
                  className="check-button"
                  aria-label={`Complete ${t.title}`}
                  onClick={() =>
                    update({
                      ...profile,
                      tasks: {
                        ...profile.tasks,
                        tasks: tasks.map((x) =>
                          x.id === t.id ? { ...x, completed: true } : x,
                        ),
                      },
                    })
                  }
                />
                <div className="entry-body">
                  <strong>{t.title}</strong>
                  <div className="entry-meta">
                    <span>{t.schedule}</span>
                    {t.location && (
                      <>
                        <i />
                        <span>{t.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`priority-label ${t.priority}`}>
                  {t.priority === "middle" ? "medium" : t.priority}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <Check size={30} />
              <h3>You’re all caught up.</h3>
              <p>Add a new goal whenever you’re ready.</p>
            </div>
          )}
        </section>
        <section className="armory-feature">
          <span className="eyebrow">THINK A FEW STEPS AHEAD</span>
          <div className="armory-feature-icon">
            <Swords size={54} strokeWidth={1} />
          </div>
          <h2>
            Make your next
            <br />
            build count.
          </h2>
          <p>
            Explore 10,000 items, trace crafting recipes and shape your
            character.
          </p>
          <button className="text-button" onClick={() => go("builds")}>
            Open the Armory
            <ArrowUpRight size={18} />
          </button>
        </section>
      </div>
      <div className="quick-links">
        <button onClick={() => go("flow")}>
          <GitBranch size={23} />
          <div>
            <strong>Map your progression</strong>
            <span>Make a plan. Follow your path.</span>
          </div>
          <ArrowUpRight size={18} />
        </button>
        <button onClick={() => go("skills")}>
          <BookOpen size={23} />
          <div>
            <strong>Refine your skills</strong>
            <span>Find the right balance for your class.</span>
          </div>
          <ArrowUpRight size={18} />
        </button>
        <button onClick={() => go("settings")}>
          <Download size={23} />
          <div>
            <strong>Keep a backup</strong>
            <span>Your adventure is saved on this device.</span>
          </div>
          <ArrowUpRight size={18} />
        </button>
      </div>
    </div>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <div className="panel empty-state" role="alert">
        <h2>This tool could not be displayed.</h2>
        <p>
          Your saved profile remains in browser storage. Try another tool or
          export it from Settings.
        </p>
        <button
          className="button secondary"
          onClick={() => this.setState({ error: "" })}
        >
          Try again
        </button>
        <details>
          <summary>Technical details</summary>
          {this.state.error}
        </details>
      </div>
    ) : (
      this.props.children
    );
  }
}
