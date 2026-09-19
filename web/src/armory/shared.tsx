import { useEffect, useState } from "react";
export function useData<T>(file: string) {
  const [data, set] = useState<T>();
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    set(undefined);
    setError("");
    fetch("/data/" + file + ".json")
      .then((r) => {
        if (!r.ok) throw Error("Snapshot unavailable");
        return r.json();
      })
      .then((d) => {
        if (file === "items_all" && Array.isArray(d.items)) {
          d.items = d.items.map((item: Record<string, unknown>) => ({
            ...item,
            options: Array.isArray(item.options) ? item.options : [],
            classNames: Array.isArray(item.classNames) ? item.classNames : [],
          }));
        }
        if (live) set(d);
      })
      .catch((e) => {
        if (live) setError(String(e));
      });
    return () => {
      live = false;
    };
  }, [file]);
  return { data, error };
}
export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: (string | [string, string])[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const [v, l] = Array.isArray(o) ? o : [o, o];
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </label>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1000000,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="field">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(Math.min(max, Math.max(min, Number(e.target.value) || 0)))
        }
      />
    </label>
  );
}
export const plain = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&");
export function Loading({ error }: { error: string }) {
  return (
    <div className="empty-state" role="status">
      {error || "Loading release snapshot…"}
    </div>
  );
}
