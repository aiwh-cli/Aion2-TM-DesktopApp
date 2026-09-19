import Items from "./items";
import Crafting, { type Shopping } from "./crafting";
import Builds from "./builds";
import Skills from "./skills";
import Daevanion from "./daevanion";
import Arcana from "./arcana";
import type { ArmoryState } from "./state";
import "./armory.css";
export {
  createArmoryState,
  normalizeArmoryState,
  type ArmoryState,
} from "./state";
export type ArmoryTab =
  "items" | "crafting" | "builds" | "skills" | "daevanion" | "arcana";
export default function Armory({
  tab,
  state,
  onChange,
  onAddShopping,
}: {
  tab: ArmoryTab;
  state: ArmoryState;
  onChange: (next: ArmoryState) => void;
  onAddShopping: (items: Shopping[]) => void;
}) {
  const props = { state, onChange };
  return (
    <section className="armory">
      {tab === "items" ? (
        <Items {...props} />
      ) : tab === "crafting" ? (
        <Crafting {...props} onAddShopping={onAddShopping} />
      ) : tab === "builds" ? (
        <Builds {...props} />
      ) : tab === "skills" ? (
        <Skills {...props} />
      ) : tab === "daevanion" ? (
        <Daevanion {...props} />
      ) : (
        <Arcana {...props} />
      )}
    </section>
  );
}
