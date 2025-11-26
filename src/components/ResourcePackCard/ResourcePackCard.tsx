import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import s from "./styles.module.scss";

export interface ResourcePackCardMetadata {
  label: string;
  value: string;
}

export interface ResourcePackCardProps {
  name: string;
  description?: ReactNode;
  iconSrc?: string;
  metadata?: ResourcePackCardMetadata[];
  badges?: string[];
  accent?: "emerald" | "gold" | "berry";
  isDragging?: boolean;
}

type CardAccentStyle = CSSProperties & {
  "--accent-color"?: string;
};

const accentClassMap: Record<
  NonNullable<ResourcePackCardProps["accent"]>,
  string
> = {
  emerald: s.accentEmerald,
  gold: s.accentGold,
  berry: s.accentBerry,
};

export default function ResourcePackCard({
  name,
  description,
  iconSrc,
  metadata = [],
  badges = [],
  accent = "emerald",
  isDragging = false,
}: ResourcePackCardProps) {
  const [accentColor, setAccentColor] = useState<string>();

  useEffect(() => {
    if (!iconSrc) {
      setAccentColor(undefined);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = iconSrc;
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      const width = img.naturalWidth || 1;
      const height = img.naturalHeight || 1;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const dominant = extractAccentColor(imageData.data);
      setAccentColor(dominant);
    };
    img.onerror = () => {
      if (!cancelled) setAccentColor(undefined);
    };

    return () => {
      cancelled = true;
    };
  }, [iconSrc]);

  const accentStyle = useMemo<CardAccentStyle | undefined>(() => {
    if (!accentColor) return undefined;
    return {
      "--accent-color": accentColor,
    };
  }, [accentColor]);

  const accentClass = accentClassMap[accent];
  const className = [s.card, accentClass, isDragging ? s.dragging : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      data-dragging={isDragging || undefined}
      style={accentStyle}
    >
      {iconSrc && (
        <div className={s.iconFrame}>
          <img src={iconSrc} alt="" className={s.icon} />
        </div>
      )}
      <div className={s.body}>
        <div className={s.nameRow}>
          <p className={s.name}>{name}</p>
          {badges?.length > 0 && (
            <div className={s.badges}>
              {badges.map((badge) => (
                <span key={badge} className={s.badge}>
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
        {description && (
          <div className={s.description}>
            {typeof description === "string" ? (
              <span>{description}</span>
            ) : (
              description
            )}
          </div>
        )}
        {metadata.length > 0 && (
          <dl className={s.metadata}>
            {metadata.map((item) => (
              <div key={`${item.label}-${item.value}`} className={s.metaItem}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

function extractAccentColor(data: Uint8ClampedArray): string | undefined {
  if (data.length === 0) return undefined;
  const samples: Array<{ hex: string; saturation: number; lightness: number }> =
    [];
  const totalPixels = data.length / 4;
  const step = Math.max(1, Math.floor(totalPixels / 200));

  for (let i = 0; i < totalPixels; i += step) {
    const idx = i * 4;
    const alpha = data[idx + 3];
    if (alpha < 200) continue;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const { s, l } = rgbToHsl(r, g, b);
    samples.push({ hex: rgbToHex(r, g, b), saturation: s, lightness: l });
  }

  if (!samples.length) return undefined;
  samples.sort((a, b) => b.saturation - a.saturation);

  const primary = samples[0];
  const lightnessDelta = primary.lightness > 0.5 ? -0.15 : 0.15;
  return shiftLightness(primary.hex, lightnessDelta);
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      default:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number) {
  const hue2rgb = (p: number, q: number, t: number) => {
    let tNorm = t;
    if (tNorm < 0) tNorm += 1;
    if (tNorm > 1) tNorm -= 1;
    if (tNorm < 1 / 6) return p + (q - p) * 6 * tNorm;
    if (tNorm < 1 / 2) return q;
    if (tNorm < 2 / 3) return p + (q - p) * (2 / 3 - tNorm) * 6;
    return p;
  };

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return rgbToHex(
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255),
  );
}

function shiftLightness(hex: string, delta: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const { h, s, l } = rgbToHsl(r, g, b);
  const nextLightness = Math.max(0, Math.min(1, l + delta));
  return hslToHex(h, s, nextLightness);
}
