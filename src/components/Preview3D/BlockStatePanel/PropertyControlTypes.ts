/**
 * Shared types and constants for property controls
 */
import type { BlockPropertySchema } from "@lib/tauri/blockModels";

export const PROPERTY_DESCRIPTIONS: Record<string, string> = {
  distance:
    "Distance from nearest log (1-7). Leaves with distance 7 will decay unless persistent.",
  persistent: "Player-placed leaves that won't decay naturally.",
  waterlogged: "Whether this block contains water.",
  facing: "Direction the block faces.",
  axis: "Orientation axis of the block.",
  half: "Upper or lower half of a two-block-tall structure.",
  type: "Variant type of this block.",
  age: "Growth stage of crops or plants.",
  level: "Fluid level or fill amount.",
  power: "Redstone signal strength (0-15).",
  lit: "Whether this block is currently lit/active.",
  open: "Whether this block is in an open state.",
  powered: "Whether this block is receiving redstone power.",
  snowy: "Whether the block has snow on top.",
  candles: "Number of candles placed on this block (1-4).",
  pickles: "Number of sea pickles in this block (1-4).",
  eggs: "Number of turtle eggs in this nest (1-4).",
  layers: "Number of snow layers (1-8).",
  wall: "Mount this block on a wall (torches, signs, banners, etc.).",
};

export interface PropertyControlProps {
  prop: BlockPropertySchema;
  currentValue: string;
  blockProps: Record<string, string>;
  onValueChange: (newValue: string) => void;
  maxAge?: number;
  currentAge?: number;
  sliderPreviewValues: Record<string, string>;
  onSliderPreviewChange: (propName: string, value: string | null) => void;
}
