/**
 * Minecraft color code parser
 *
 * Minecraft uses § (section sign) or \u00a7 for color codes
 * Format: §X where X is a color/formatting code
 *
 * Color codes:
 * §0 - Black
 * §1 - Dark Blue
 * §2 - Dark Green
 * §3 - Dark Aqua
 * §4 - Dark Red
 * §5 - Dark Purple
 * §6 - Gold
 * §7 - Gray
 * §8 - Dark Gray
 * §9 - Blue
 * §a - Green
 * §b - Aqua
 * §c - Red
 * §d - Light Purple
 * §e - Yellow
 * §f - White
 *
 * Formatting codes:
 * §l - Bold
 * §o - Italic
 * §n - Underline
 * §m - Strikethrough
 * §k - Obfuscated
 * §r - Reset
 */

export interface ColorSegment {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#AAAAAA",
  "8": "#555555",
  "9": "#5555FF",
  a: "#55FF55",
  b: "#55FFFF",
  c: "#FF5555",
  d: "#FF55FF",
  e: "#FFFF55",
  f: "#FFFFFF",
};

/**
 * Parse Minecraft formatted text into color segments
 */
export function parseMinecraftText(text: string): ColorSegment[] {
  const segments: ColorSegment[] = [];

  // Replace \u00a7 with § for consistent parsing
  const normalized = text.replace(/\\u00a7/g, "§");

  // Split by color codes
  const parts = normalized.split(/(§[0-9a-fk-or])/gi);

  let currentColor: string | undefined;
  let currentBold = false;
  let currentItalic = false;
  let currentUnderline = false;
  let currentStrikethrough = false;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (!part) continue;

    // Check if this is a color code
    if (part.match(/^§[0-9a-fk-or]$/i)) {
      const code = part[1].toLowerCase();

      // Color codes
      if (COLOR_MAP[code]) {
        currentColor = COLOR_MAP[code];
      }
      // Formatting codes
      else if (code === "l") {
        currentBold = true;
      } else if (code === "o") {
        currentItalic = true;
      } else if (code === "n") {
        currentUnderline = true;
      } else if (code === "m") {
        currentStrikethrough = true;
      } else if (code === "r") {
        // Reset all formatting
        currentColor = undefined;
        currentBold = false;
        currentItalic = false;
        currentUnderline = false;
        currentStrikethrough = false;
      }
    }
    // This is text content
    else {
      if (part.trim()) {
        segments.push({
          text: part,
          color: currentColor,
          bold: currentBold,
          italic: currentItalic,
          underline: currentUnderline,
          strikethrough: currentStrikethrough,
        });
      }
    }
  }

  return segments;
}

/**
 * Convert color segments to HTML for rendering
 */
export function segmentsToHTML(segments: ColorSegment[]): string {
  return segments
    .map((segment) => {
      let html = segment.text;
      const styles: string[] = [];

      if (segment.color) {
        styles.push(`color: ${segment.color}`);
      }

      if (segment.bold) {
        html = `<strong>${html}</strong>`;
      }

      if (segment.italic) {
        html = `<em>${html}</em>`;
      }

      if (segment.underline) {
        styles.push("text-decoration: underline");
      }

      if (segment.strikethrough) {
        styles.push("text-decoration: line-through");
      }

      if (styles.length > 0) {
        return `<span style="${styles.join("; ")}">${html}</span>`;
      }

      return html;
    })
    .join("");
}

/**
 * Parse and convert Minecraft text to HTML in one step
 */
export function minecraftTextToHTML(text: string): string {
  const segments = parseMinecraftText(text);
  return segmentsToHTML(segments);
}
