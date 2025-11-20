import s from "./styles.module.scss";

interface MinecraftCSSBlockProps {
  /** Texture URL for top face (defaults to textureSrc) */
  topSrc?: string;
  /** Texture URL for left/front face (defaults to textureSrc) */
  leftSrc?: string;
  /** Texture URL for right/side face (defaults to textureSrc) */
  rightSrc?: string;
  /** Single texture URL for all faces (used if specific faces not provided) */
  textureSrc?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Size of the block in pixels (default 64) */
  size?: number;
  /** Callback when any texture fails to load */
  onError?: () => void;
}

/**
 * Renders a Minecraft-style isometric block using CSS 3D transforms.
 * Shows three faces: top, left (front), and right (side).
 *
 * The block uses CSS transforms to create a 3D isometric view similar
 * to how blocks appear in the Minecraft inventory.
 */
export default function MinecraftCSSBlock({
  topSrc,
  leftSrc,
  rightSrc,
  textureSrc,
  alt = "Block",
  size = 64,
  onError,
}: MinecraftCSSBlockProps) {
  // Use textureSrc as fallback for any face not specified
  const top = topSrc || textureSrc;
  const left = leftSrc || textureSrc;
  const right = rightSrc || textureSrc;

  // Calculate face size based on overall size
  // The isometric view shows faces at an angle, so we need to adjust
  const faceSize = Math.round(size * 0.7);

  return (
    <div
      className={s.blockContainer}
      style={{
        width: size,
        height: size,
        '--face-size': `${faceSize}px`,
      } as React.CSSProperties}
    >
      <div className={s.block}>
        {/* Top face - rotated to face up */}
        <div className={s.faceTop}>
          {top && (
            <img
              src={top}
              alt={`${alt} top`}
              onError={onError}
              draggable={false}
            />
          )}
        </div>

        {/* Left face - front-left side */}
        <div className={s.faceLeft}>
          {left && (
            <img
              src={left}
              alt={`${alt} left`}
              onError={onError}
              draggable={false}
            />
          )}
        </div>

        {/* Right face - front-right side */}
        <div className={s.faceRight}>
          {right && (
            <img
              src={right}
              alt={`${alt} right`}
              onError={onError}
              draggable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
