import { useRef, useState } from "react";
import {
  Download,
  Upload,
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  Check,
} from "lucide-react";
import {
  type Profile,
  type Store,
  DAYS,
  download,
  normalizeProfile,
  parseImport,
  uid,
} from "../core";
import Modal from "./Modal";
export const THEMES = [
  { id: "abyss", name: "Abyss", color: "#c6b78c" },
  { id: "inferno", name: "Inferno", color: "#e89a7d" },
  { id: "emerald", name: "Emerald", color: "#91c7a3" },
  { id: "frostbite", name: "Frostbite", color: "#9bc8db" },
  { id: "obsidian", name: "Obsidian", color: "#c9c9c9" },
  { id: "void", name: "Void", color: "#b6a0da" },
];
export default function Settings({
  store,
  profile,
  update,
  setStore,
  notify,
}: {
  store: Store;
  profile: Profile;
  update: (p: Profile) => void;
  setStore: (s: Store) => void;
  notify: (s: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [deleteId, setDeleteId] = useState<string | null>(null);
  const patch = (s: Partial<Profile["settings"]>) =>
    update({ ...profile, settings: { ...profile.settings, ...s } });
  const importFile = async (file: File) => {
    try {
      const profiles = parseImport(await file.text());
      setStore({
        ...store,
        profiles: [...store.profiles, ...profiles],
        activeId: profiles[0].id,
      });
      notify(
        `Imported ${profiles.length} profile${profiles.length === 1 ? "" : "s"} as new copies.`,
      );
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <div className="page-content settings-grid">
      <section className="panel settings-section">
        <span className="eyebrow">Your characters</span>
        <h2>Profiles & backups</h2>
        <p className="muted">
          Saved in this browser on this device. Export a backup to move to
          another device or keep a safe copy.
        </p>
        <div className="profile-list">
          {store.profiles.map((p) => (
            <div
              className={`profile-row ${p.id === profile.id ? "current" : ""}`}
              key={p.id}
            >
              <button onClick={() => setStore({ ...store, activeId: p.id })}>
                <span className="profile-avatar">
                  {p.profile_name.slice(0, 1).toUpperCase()}
                </span>
                <span>{p.profile_name}</span>
                {p.id === profile.id && <Check size={16} />}
              </button>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label={`Duplicate ${p.profile_name}`}
                  onClick={() => {
                    const copy = normalizeProfile({
                      ...structuredClone(p),
                      id: uid(),
                      profile_name: `${p.profile_name} copy`,
                    });
                    setStore({
                      ...store,
                      profiles: [...store.profiles, copy],
                      activeId: copy.id,
                    });
                    notify("Profile duplicated.");
                  }}
                >
                  <Copy size={16} />
                </button>
                <button
                  className="icon-button danger"
                  disabled={store.profiles.length === 1}
                  aria-label={`Delete profile ${p.profile_name}`}
                  onClick={() => setDeleteId(p.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <label className="field">
          Current profile name
          <input
            required
            value={profile.profile_name}
            maxLength={80}
            onChange={(e) =>
              update({ ...profile, profile_name: e.target.value })
            }
          />
        </label>
        <div className="button-group wrap">
          <button
            className="button secondary"
            onClick={() => {
              setName("");
              setCreating(true);
            }}
          >
            <Plus size={16} />
            New profile
          </button>
          <button
            className="button secondary"
            onClick={() => input.current?.click()}
          >
            <Upload size={16} />
            Import JSON
          </button>
          <button
            className="button secondary"
            onClick={() =>
              download(
                `${profile.profile_name || "profile"}.json`,
                JSON.stringify(profile, null, 2),
              )
            }
          >
            <Download size={16} />
            Export profile
          </button>
          <button
            className="text-button"
            onClick={() =>
              download(
                "aion2-all-profiles.json",
                JSON.stringify(store, null, 2),
              )
            }
          >
            Back up all profiles
          </button>
        </div>
        <input
          ref={input}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importFile(f);
            e.target.value = "";
          }}
        />
        <p className="footnote">
          Desktop tasks, shopping, templates, timer settings and flow maps can
          be imported. Desktop Armory fields are preserved in backups; browser
          Armory builds use their own format.
        </p>
      </section>
      <section className="panel settings-section">
        <span className="eyebrow">Make it yours</span>
        <h2>Appearance</h2>
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-choice ${profile.theme === t.id ? "chosen" : ""}`}
              onClick={() => update({ ...profile, theme: t.id })}
            >
              <span style={{ background: t.color }} />
              {t.name}
              {profile.theme === t.id && <Check size={15} />}
            </button>
          ))}
        </div>
        <div className="settings-divider" />
        <span className="eyebrow">Your routine</span>
        <h2>Reset schedule</h2>
        <p className="muted">
          Times use {Intl.DateTimeFormat().resolvedOptions().timeZone}. Match
          these to your game server’s resets.
        </p>
        <div className="form-grid">
          <label className="field">
            Daily reset
            <input
              type="time"
              value={profile.settings.daily_reset_time}
              onChange={(e) => {
                if (e.target.value)
                  patch({
                    daily_reset_time: e.target.value,
                    web_last_daily: 0,
                  });
              }}
            />
          </label>
          <label className="field">
            Weekly reset
            <input
              type="time"
              value={profile.settings.weekly_reset_time}
              onChange={(e) => {
                if (e.target.value)
                  patch({
                    weekly_reset_time: e.target.value,
                    web_last_weekly: 0,
                  });
              }}
            />
          </label>
          <label className="field">
            Weekly reset day
            <select
              value={profile.settings.weekly_reset_day}
              onChange={(e) =>
                patch({ weekly_reset_day: e.target.value, web_last_weekly: 0 })
              }
            >
              {DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="settings-divider" />
        <h3>World event timers</h3>
        <div className="form-grid">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={profile.settings.shugo_enabled}
              onChange={(e) => patch({ shugo_enabled: e.target.checked })}
            />
            Show Shugo event
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={profile.settings.riss_enabled}
              onChange={(e) => patch({ riss_enabled: e.target.checked })}
            />
            Show Rift event
          </label>
          <label className="field">
            Shugo interval
            <select
              value={profile.settings.shugo_interval_text}
              onChange={(e) => patch({ shugo_interval_text: e.target.value })}
            >
              {["15min", "30min", "1h", "2h", "3h"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Shugo starting minute
            <input
              type="number"
              min="0"
              max="59"
              value={profile.settings.shugo_start_minute}
              onChange={(e) =>
                patch({
                  shugo_start_minute: Math.max(
                    0,
                    Math.min(59, Number(e.target.value)),
                  ),
                })
              }
            />
          </label>
          <label className="field">
            Rift interval
            <select
              value={profile.settings.riss_interval_text}
              onChange={(e) => patch({ riss_interval_text: e.target.value })}
            >
              {["30min", "1h", "2h", "3h", "4h", "6h"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Rift starting hour
            <input
              type="number"
              min="0"
              max="23"
              value={profile.settings.riss_anchor_hour}
              onChange={(e) =>
                patch({
                  riss_anchor_hour: Math.max(
                    0,
                    Math.min(23, Number(e.target.value)),
                  ),
                })
              }
            />
          </label>
        </div>
      </section>
      <section className="panel settings-section about-section">
        <div>
          <span className="eyebrow">Aion 2 Companion · Browser edition</span>
          <h2>Built for the journey.</h2>
          <p>
            Adapted from blacksole’s Aion2 Task Manager v2.0.7. Game datasets
            and artwork are bundled from that release and belong to their
            respective owners. This is an unofficial fan tool.
          </p>
          <p className="muted">
            The in-game overlay, Windows automation and desktop auto-updater
            require the original desktop app. The browser edition has no account
            login or cloud sync. Game data is a snapshot, not a live feed;
            season availability and estimated stats can differ from the game.
          </p>
        </div>
        <div className="button-group wrap">
          <a
            className="button secondary"
            href="https://github.com/blacksole/Aion2-TM-DesktopApp"
            target="_blank"
            rel="noreferrer"
          >
            Original project
            <ExternalLink size={15} />
          </a>
          <a
            className="button secondary"
            href="https://github.com/aiwh-cli/Aion2-TM-DesktopApp/tree/web-version"
            target="_blank"
            rel="noreferrer"
          >
            Your source code
            <ExternalLink size={15} />
          </a>
        </div>
      </section>
      {creating && (
        <Modal title="New character profile" onClose={() => setCreating(false)}>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              const p = normalizeProfile({
                profile_name: name.trim(),
                theme: profile.theme,
                task_templates: profile.task_templates,
                item_templates: profile.item_templates,
              });
              setStore({
                ...store,
                profiles: [...store.profiles, p],
                activeId: p.id,
              });
              setCreating(false);
            }}
          >
            <label className="field">
              Profile name
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button className="button primary">Create profile</button>
          </form>
        </Modal>
      )}
      {deleteId && (
        <Modal title="Delete this profile?" onClose={() => setDeleteId(null)}>
          <p>
            Its saved tasks, maps and browser builds will be removed. Export a
            backup first if you want to keep them.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                const profiles = store.profiles.filter(
                  (p) => p.id !== deleteId,
                );
                setStore({
                  ...store,
                  profiles,
                  activeId:
                    store.activeId === deleteId
                      ? profiles[0].id
                      : store.activeId,
                });
                setDeleteId(null);
              }}
            >
              Delete profile
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
