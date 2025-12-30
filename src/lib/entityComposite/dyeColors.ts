export type DyeId =
  | "white"
  | "orange"
  | "magenta"
  | "light_blue"
  | "yellow"
  | "lime"
  | "pink"
  | "gray"
  | "light_gray"
  | "cyan"
  | "purple"
  | "blue"
  | "brown"
  | "green"
  | "red"
  | "black";

export const DYE_COLORS: Array<{
  id: DyeId;
  label: string;
  /**
   * Minecraft "texture diffuse" color multiplier (sRGB 0..1).
   * Source: `net.minecraft.world.item.DyeColor#getTextureDiffuseColors`
   * (stable across many versions).
   */
  rgb: { r: number; g: number; b: number };
}> = [
  { id: "white", label: "White", rgb: { r: 1.0, g: 1.0, b: 1.0 } },
  { id: "orange", label: "Orange", rgb: { r: 0.85, g: 0.5, b: 0.2 } },
  { id: "magenta", label: "Magenta", rgb: { r: 0.7, g: 0.3, b: 0.85 } },
  { id: "light_blue", label: "Light Blue", rgb: { r: 0.4, g: 0.6, b: 0.85 } },
  { id: "yellow", label: "Yellow", rgb: { r: 0.9, g: 0.9, b: 0.2 } },
  { id: "lime", label: "Lime", rgb: { r: 0.5, g: 0.8, b: 0.1 } },
  { id: "pink", label: "Pink", rgb: { r: 0.95, g: 0.5, b: 0.65 } },
  { id: "gray", label: "Gray", rgb: { r: 0.3, g: 0.3, b: 0.3 } },
  { id: "light_gray", label: "Light Gray", rgb: { r: 0.6, g: 0.6, b: 0.6 } },
  { id: "cyan", label: "Cyan", rgb: { r: 0.3, g: 0.5, b: 0.6 } },
  { id: "purple", label: "Purple", rgb: { r: 0.5, g: 0.25, b: 0.7 } },
  { id: "blue", label: "Blue", rgb: { r: 0.2, g: 0.3, b: 0.7 } },
  { id: "brown", label: "Brown", rgb: { r: 0.4, g: 0.3, b: 0.2 } },
  { id: "green", label: "Green", rgb: { r: 0.4, g: 0.5, b: 0.2 } },
  { id: "red", label: "Red", rgb: { r: 0.6, g: 0.2, b: 0.2 } },
  { id: "black", label: "Black", rgb: { r: 0.1, g: 0.1, b: 0.1 } },
];

export function getDyeRgb(id: string | undefined): { r: number; g: number; b: number } {
  const found = DYE_COLORS.find((d) => d.id === id);
  return found?.rgb ?? DYE_COLORS[0].rgb;
}
