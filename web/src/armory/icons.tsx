import { useState } from "react";
import { Diamond, Swords } from "lucide-react";
import assets from "./icon-assets.json";
import type { Item, Skill } from "./model";

// Case-sensitive paths from the bundled v2.0.7 artwork.
const bundled = new Set(assets);
export function assetIcon(path: string) {
  return bundled.has(path) ? `/game-assets/${path}` : undefined;
}

const equipment: Record<string, string> = {
  Weapon: "weapon",
  Guard: "guard",
  Helm: "helm",
  Top: "top",
  Pauldrons: "pauldrons",
  Gloves: "gloves",
  Legs: "legs",
  Shoes: "shoes",
  Cloak: "cloak",
  Necklace: "necklace",
  Earrings: "earrings_1",
  Earrings2: "earrings_2",
  Ring: "ring_1",
  Ring2: "ring_2",
  Bracelet: "bracelet_1",
  Bracelet2: "bracelet_2",
  Amulet: "amulet",
  Wings: "wings",
};
const weapons = new Set([
  "Greatsword",
  "Longsword",
  "Dagger",
  "Bow",
  "Spellbook",
  "Orb",
  "Mace",
  "Staff",
  "Fist",
  "Gauntlet",
]);
export function slotIcon(slot: string) {
  const name = equipment[weapons.has(slot) ? "Weapon" : slot];
  return name
    ? assetIcon(`slot_placeholders/equipment/${name}.png`)
    : undefined;
}

export function GameIcon({
  src,
  fallback,
  label,
  grade = "",
  size = "medium",
}: {
  src?: string;
  fallback?: string;
  label: string;
  grade?: string;
  size?: "small" | "medium" | "large";
}) {
  const candidates = [
    ...new Set([src, fallback].filter((s): s is string => !!s)),
  ];
  return (
    <IconImage
      key={candidates.join("|")}
      candidates={candidates}
      label={label}
      grade={grade}
      size={size}
    />
  );
}

function IconImage({
  candidates,
  label,
  grade,
  size,
}: {
  candidates: string[];
  label: string;
  grade: string;
  size: string;
}) {
  const [attempt, setAttempt] = useState(0);
  return (
    <span
      className={`game-icon game-icon-${size}`}
      data-grade={grade.toLowerCase()}
      title={label}
      aria-hidden="true"
    >
      {candidates[attempt] ? (
        <img
          src={candidates[attempt]}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setAttempt(attempt + 1)}
        />
      ) : (
        <Diamond size={22} />
      )}
    </span>
  );
}

export function ItemIcon({
  item,
  slot = "",
  size,
}: {
  item?: Item;
  slot?: string;
  size?: "small" | "medium" | "large";
}) {
  return (
    <GameIcon
      src={item?.image}
      fallback={slotIcon(item?.categoryName || slot)}
      label={item?.name || `${slot || "Item"} slot`}
      grade={item?.grade}
      size={size}
    />
  );
}

export function SkillIcon({ skill }: { skill: Skill }) {
  const remote = skill.icon
    ? `https://cdn.questlog.gg/aion-2/assets/Game/UI/Resource/Texture/Skill/${encodeURIComponent(skill.icon)}.webp`
    : undefined;
  return (
    <GameIcon
      src={assetIcon(`skill_icons/${skill.iconFile}`) || remote}
      label={skill.name}
    />
  );
}

export function ClassIcon({ name }: { name: string }) {
  const src = assetIcon(`class_icons/${name.toLowerCase()}.png`);
  return src ? (
    <GameIcon src={src} label={name} />
  ) : (
    <span className="game-icon" title={name} aria-hidden="true">
      <Swords size={25} />
    </span>
  );
}

export function nodeIcon(grade: string, active: boolean) {
  const tier = grade.charAt(0).toUpperCase() + grade.slice(1);
  const suffix = active || grade === "start" ? "Sprite" : "Disabled_Sprite";
  return assetIcon(
    `daevanion_nodes/UT_FWindow_Daevanion_Node_${tier}_${suffix}.webp`,
  );
}
