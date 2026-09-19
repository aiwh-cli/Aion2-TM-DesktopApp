import { useState, useEffect, useRef, type FormEvent } from "react";
import {
  Clock3,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Pencil,
  Trash2,
  Bell,
} from "lucide-react";
import {
  type Profile,
  type Timer,
  normalizeTimer,
  resetBoundary,
  nextInterval,
  intervalMs,
  timerRemaining,
  countdown,
  DAYS,
  localDateTime,
} from "../core";
import Modal from "./Modal";
export function useNow() {
  const [now, set] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => set(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
export function resetCards(profile: Profile, now: Date) {
  const s = profile.settings;
  return [
    {
      name: "Daily reset",
      value: countdown(
        (+resetBoundary(now, s.daily_reset_time, undefined, true) - +now) /
          1000,
      ),
      detail: `Every day · ${s.daily_reset_time}`,
    },
    {
      name: "Weekly reset",
      value: countdown(
        (+resetBoundary(now, s.weekly_reset_time, s.weekly_reset_day, true) -
          +now) /
          1000,
      ),
      detail: `${s.weekly_reset_day} · ${s.weekly_reset_time}`,
    },
    ...(s.shugo_enabled
      ? [
          {
            name: "Shugo event",
            value: countdown(
              (nextInterval(
                now,
                `00:${String(s.shugo_start_minute).padStart(2, "0")}`,
                intervalMs(s.shugo_interval_text),
              ) -
                +now) /
                1000,
            ),
            detail: `Every ${s.shugo_interval_text}`,
          },
        ]
      : []),
    ...(s.riss_enabled
      ? [
          {
            name: "Rift event",
            value: countdown(
              (nextInterval(
                now,
                `${String(s.riss_anchor_hour).padStart(2, "0")}:00`,
                intervalMs(s.riss_interval_text),
              ) -
                +now) /
                1000,
            ),
            detail: `Every ${s.riss_interval_text}`,
          },
        ]
      : []),
  ];
}
export default function Timers({
  profile,
  update,
  notify,
}: {
  profile: Profile;
  update: (p: Profile) => void;
  notify: (s: string) => void;
}) {
  const now = useNow(),
    [edit, setEdit] = useState<Timer | null>(null),
    [deleting, setDeleting] = useState<string | null>(null),
    [notifications, setNotifications] = useState(false),
    notified = useRef(new Set<string>());
  const timers = profile.settings.custom_timers,
    change = (next: Timer[]) =>
      update({
        ...profile,
        settings: { ...profile.settings, custom_timers: next },
      });
  useEffect(() => {
    for (const t of timers) {
      if (t.end && t.end <= +now && !notified.current.has(`${t.id}-${t.end}`)) {
        notified.current.add(`${t.id}-${t.end}`);
        notify(`${t.name} is ready.`);
        if (
          notifications &&
          "Notification" in window &&
          Notification.permission === "granted"
        )
          new Notification("Aion 2 Companion", { body: `${t.name} is ready.` });
      }
    }
  }, [now, timers, notifications, notify]);
  return (
    <div className="page-content">
      <div className="section-heading">
        <p className="muted">
          Countdowns follow your device time:{" "}
          {Intl.DateTimeFormat().resolvedOptions().timeZone}.
        </p>
        <div className="button-group">
          <button
            className="button secondary"
            onClick={async () => {
              if (!("Notification" in window)) {
                notify("This browser does not support notifications.");
                return;
              }
              const p = await Notification.requestPermission();
              setNotifications(p === "granted");
              notify(
                p === "granted"
                  ? "Countdown notifications enabled for this open page."
                  : "Notifications were not enabled.",
              );
            }}
          >
            <Bell size={16} />
            {notifications ? "Notifications on" : "Enable notifications"}
          </button>
          <button
            className="button primary"
            onClick={() => setEdit(normalizeTimer({ name: "" }))}
          >
            <Plus size={16} />
            Add timer
          </button>
        </div>
      </div>
      <div className="timer-grid">
        {resetCards(profile, now).map((t, i) => (
          <div className={`timer-card timer-${i}`} key={t.name}>
            <div className="timer-top">
              <span className="eyebrow">{t.name}</span>
              <Clock3 size={19} />
            </div>
            <strong>{t.value}</strong>
            <span className="muted">{t.detail}</span>
          </div>
        ))}
      </div>
      <div className="section-heading spaced">
        <h2>Your timers</h2>
        <span className="badge">{timers.length} timers</span>
      </div>
      <div className="timer-grid">
        {timers.map((t) => (
          <div
            className="timer-card custom"
            key={t.id}
            style={{ borderTopColor: t.color }}
          >
            <div className="timer-top">
              <span className="eyebrow">{t.category}</span>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label={`Edit ${t.name}`}
                  onClick={() => setEdit(t)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Delete ${t.name}`}
                  onClick={() => setDeleting(t.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <h3>{t.name}</h3>
            <strong style={{ color: t.color }}>
              {countdown(timerRemaining(t, now))}
            </strong>
            <div className="timer-bottom">
              <span className="muted">{t.timer_mode}</span>
              {t.timer_mode === "countdown" && (
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={`${t.end && t.end > +now ? "Pause" : "Start"} ${t.name}`}
                    onClick={() =>
                      change(
                        timers.map((x) =>
                          x.id === t.id
                            ? {
                                ...x,
                                end:
                                  t.end && t.end > +now
                                    ? null
                                    : +now +
                                      (t.remaining > 0 && t.end === null
                                        ? t.remaining
                                        : t.countdown_duration_seconds) *
                                        1000,
                                remaining: t.end
                                  ? timerRemaining(t, now)
                                  : t.remaining,
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    {t.end && t.end > +now ? (
                      <Pause size={18} />
                    ) : (
                      <Play size={18} />
                    )}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Reset ${t.name}`}
                    onClick={() =>
                      change(
                        timers.map((x) =>
                          x.id === t.id
                            ? {
                                ...x,
                                end: null,
                                remaining: x.countdown_duration_seconds,
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    <RotateCcw size={17} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {!timers.length && (
        <div className="panel empty-state">
          <Clock3 size={32} />
          <h3>Never miss your next event</h3>
          <p>Add a countdown or a repeating timer for your own routine.</p>
        </div>
      )}
      <p className="footnote">
        Reset times are configurable in Settings. Notifications require this
        page to remain open; browsers may delay background alerts.
      </p>
      {edit && (
        <TimerEditor
          timer={edit}
          onClose={() => setEdit(null)}
          onSave={(t) => {
            change(
              timers.some((x) => x.id === t.id)
                ? timers.map((x) => (x.id === t.id ? t : x))
                : [...timers, t],
            );
            setEdit(null);
          }}
        />
      )}
      {deleting && (
        <Modal title="Delete timer?" onClose={() => setDeleting(null)}>
          <p>This timer will be removed.</p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="button primary"
              onClick={() => {
                change(timers.filter((t) => t.id !== deleting));
                setDeleting(null);
              }}
            >
              Delete timer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function TimerEditor({
  timer,
  onClose,
  onSave,
}: {
  timer: Timer;
  onClose: () => void;
  onSave: (t: Timer) => void;
}) {
  const [t, set] = useState(timer);
  const patch = (p: Partial<Timer>) => set({ ...t, ...p });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const firstOccurrence = new FormData(e.currentTarget).get("anchor_at");
    const anchor =
      typeof firstOccurrence === "string"
        ? +new Date(firstOccurrence)
        : t.anchor_at;
    if (!Number.isFinite(anchor)) return;
    onSave({
      ...t,
      anchor_at: anchor,
      start_time:
        typeof firstOccurrence === "string"
          ? firstOccurrence.slice(11, 16)
          : t.start_time,
      name: t.name.trim(),
      remaining: t.countdown_duration_seconds,
      end: null,
    });
  };
  return (
    <Modal title="Timer settings" onClose={onClose}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          Timer name
          <input
            autoFocus
            required
            value={t.name}
            maxLength={120}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Mode
            <select
              value={t.timer_mode}
              onChange={(e) =>
                patch({ timer_mode: e.target.value as Timer["timer_mode"] })
              }
            >
              <option value="countdown">Countdown</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="hourly">Hourly interval</option>
              <option value="custom">Custom interval</option>
            </select>
          </label>
          <label className="field">
            Category
            <input
              value={t.category}
              maxLength={80}
              onChange={(e) => patch({ category: e.target.value })}
            />
          </label>
          {t.timer_mode === "countdown" ? (
            <label className="field">
              Duration (minutes)
              <input
                type="number"
                required
                min="1"
                max="525600"
                value={t.countdown_duration_seconds / 60}
                onChange={(e) =>
                  patch({
                    countdown_duration_seconds: Number(e.target.value) * 60,
                  })
                }
              />
            </label>
          ) : t.timer_mode === "daily" || t.timer_mode === "weekly" ? (
            <>
              <label className="field">
                Reset time
                <input
                  required
                  type="time"
                  value={t.reset_time}
                  onChange={(e) => patch({ reset_time: e.target.value })}
                />
              </label>
              {t.timer_mode === "weekly" && (
                <label className="field">
                  Day
                  <select
                    value={t.reset_day}
                    onChange={(e) => patch({ reset_day: e.target.value })}
                  >
                    {DAYS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          ) : (
            <>
              <label className="field">
                Interval (minutes)
                <input
                  type="number"
                  required
                  min="1"
                  max="525600"
                  value={
                    t.timer_mode === "hourly"
                      ? t.interval_minutes
                      : t.interval_seconds / 60
                  }
                  onChange={(e) =>
                    patch({
                      interval_minutes: Number(e.target.value),
                      interval_seconds: Number(e.target.value) * 60,
                    })
                  }
                />
              </label>
              <label className="field">
                First occurrence (local time)
                <input
                  required
                  type="datetime-local"
                  name="anchor_at"
                  defaultValue={localDateTime(t.anchor_at)}
                />
              </label>
            </>
          )}
          <label className="field">
            Color
            <input
              type="color"
              value={t.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            Save timer
          </button>
        </div>
      </form>
    </Modal>
  );
}
