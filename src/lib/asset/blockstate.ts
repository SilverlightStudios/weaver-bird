/**
 * Block state utilities for extracting and applying defaults
 */
import { getBaseName } from "./parsing";

interface BlockStateSuffix {
  pattern: RegExp;
  property: string;
  value: string;
  opposite?: { suffix: string; value: string };
}

const BLOCK_STATE_SUFFIXES: BlockStateSuffix[] = [
  { pattern: /_on$/, property: "powered", value: "true", opposite: { suffix: "_off", value: "false" } },
  { pattern: /_lit$/, property: "lit", value: "true" },
  { pattern: /_open$/, property: "open", value: "true", opposite: { suffix: "_closed", value: "false" } },
  { pattern: /_active$/, property: "active", value: "true", opposite: { suffix: "_inactive", value: "false" } },
  { pattern: /_triggered$/, property: "triggered", value: "true" },
];

/** Extract block state properties from an asset ID suffix */
export function extractBlockStateProperties(assetId: string): Record<string, string> {
  const name = assetId.replace(/^minecraft:(block\/|item\/|)/, "");
  const props: Record<string, string> = {};

  for (const suffix of BLOCK_STATE_SUFFIXES) {
    if (suffix.pattern.test(name)) {
      props[suffix.property] = suffix.value;
      break;
    }
    if (suffix.opposite && name.endsWith(suffix.opposite.suffix)) {
      props[suffix.property] = suffix.opposite.value;
      break;
    }
  }

  if (name.includes("wall_")) {
    props.wall = "true";
    props.facing = "south";
  }

  return props;
}

/** Remove block state suffixes from an asset name */
export function removeBlockStateSuffixes(name: string): string {
  let result = name;
  for (const suffix of BLOCK_STATE_SUFFIXES) {
    result = result.replace(suffix.pattern, "");
    if (suffix.opposite) {
      result = result.replace(new RegExp(`${suffix.opposite.suffix}$`), "");
    }
  }
  return result;
}

// Data-driven blockstate default configs
interface PropertyRule { keywords: string[]; value: string; exclude?: string[]; }
interface PropertyConfig { rules: PropertyRule[]; }

const AXIS_KEYWORDS = ["log", "wood", "stem", "hyphae", "pillar", "basalt", "bone_block", "hay_block", "chain"];
const FACE_KEYWORDS = ["button", "lever", "grindstone", "switch"];
const HALF_KEYWORDS = ["trapdoor", "door", "stairs", "peony", "lilac", "rose_bush", "sunflower", "tall_seagrass", "tall_grass", "large_fern"];
const OPEN_KEYWORDS = ["door", "gate", "trapdoor", "barrel"];
const POWERED_KEYWORDS = ["pressure_plate", "button", "lever", "rail", "note_block", "door", "trapdoor", "gate", "repeater", "comparator", "observer", "daylight_detector", "sculk"];

const AXIS_CONFIG: PropertyConfig = { rules: [{ keywords: AXIS_KEYWORDS, value: "y" }] };
const FACE_CONFIG: PropertyConfig = { rules: [{ keywords: FACE_KEYWORDS, value: "floor" }] };
const HALF_CONFIG: PropertyConfig = { rules: [{ keywords: HALF_KEYWORDS, value: "bottom" }] };
const OPEN_CONFIG: PropertyConfig = { rules: [{ keywords: OPEN_KEYWORDS, value: "false" }] };
const POWERED_CONFIG: PropertyConfig = { rules: [{ keywords: POWERED_KEYWORDS, value: "false" }] };

const FACING_UP_BLOCKS = ["amethyst_cluster", "pointed_dripstone", "end_rod", "lightning_rod", "candle"];
const FACING_UP_EXCLUSIONS = new Set(["torch", "lantern", "campfire"]);
const FACING_DOWN_BLOCKS = ["hopper"];
const HORIZONTAL_KEYWORDS = ["trapdoor", "stairs", "furnace", "chest", "loom", "stonecutter", "gate", "campfire", "stem", "repeater", "comparator", "bed", "door", "glazed_terracotta", "anvil", "piston", "observer", "dropper", "dispenser", "beehive", "bee_nest", "lectern"];
const UNLIT_BLOCKS = ["furnace", "smoker", "redstone_ore", "redstone_torch", "redstone_lamp", "candle"];

function matchesAny(name: string, keywords: string[]): boolean {
  return keywords.some((k) => name.includes(k));
}

function applyPropertyRule(props: Record<string, string>, propName: string, name: string, config: PropertyConfig): void {
  if (props[propName]) return;
  for (const rule of config.rules) {
    if (matchesAny(name, rule.keywords)) {
      if (rule.exclude && matchesAny(name, rule.exclude)) continue;
      props[propName] = rule.value;
      return;
    }
  }
}

function getFacingDefault(name: string, currentFace?: string): string | undefined {
  if (name.includes("shelf") && !name.includes("bookshelf")) return "south";
  if (FACING_UP_BLOCKS.some((b) => name.includes(b)) && !FACING_UP_EXCLUSIONS.has(name)) return "up";
  if (FACING_DOWN_BLOCKS.some((b) => name.includes(b))) return "down";
  const isHorizontalOnly = matchesAny(name, HORIZONTAL_KEYWORDS) ||
    ((name.includes("button") || name.includes("lever") || name.includes("grindstone")) && currentFace !== "wall");
  return isHorizontalOnly ? "north" : undefined;
}

function getLitDefault(name: string): string | undefined {
  if (name.includes("campfire")) return "true";
  return matchesAny(name, UNLIT_BLOCKS) ? "false" : undefined;
}

/** Apply sensible defaults for common blockstate properties */
export function applyNaturalBlockStateDefaults(
  props: Record<string, string>,
  assetId?: string,
): Record<string, string> {
  const result = { ...props };
  const name = assetId ? getBaseName(assetId) : "";

  applyPropertyRule(result, "axis", name, AXIS_CONFIG);
  applyPropertyRule(result, "face", name, FACE_CONFIG);
  applyPropertyRule(result, "half", name, HALF_CONFIG);
  applyPropertyRule(result, "open", name, OPEN_CONFIG);
  applyPropertyRule(result, "powered", name, POWERED_CONFIG);

  if (!result.facing) {
    const facingDefault = getFacingDefault(name, result.face);
    if (facingDefault) result.facing = facingDefault;
  }

  if (!result.shape && name.includes("stairs")) result.shape = "straight";
  if (!result.lit) {
    const litDefault = getLitDefault(name);
    if (litDefault) result.lit = litDefault;
  }
  if (!result.signal_fire && name.includes("campfire")) result.signal_fire = "false";
  if (!result.power && name.includes("redstone_wire")) result.power = "15";

  return result;
}
