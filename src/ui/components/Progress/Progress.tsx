import { forwardRef, type HTMLAttributes } from "react";
import s from "./Progress.module.scss";

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The progress value (0-100)
   */
  value?: number;
  /**
   * Maximum value
   * @default 100
   */
  max?: number;
  /**
   * Show percentage label
   * @default false
   */
  showLabel?: boolean;
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      showLabel = false,
      ...props
    },
    ref,
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className={[s.progress, className].filter(Boolean).join(" ")}
        {...props}
      >
        <div className={s.progressTrack}>
          <div
            className={s.progressIndicator}
            style={{ width: `${percentage}%` }}
          >
            {showLabel && (
              <span className={s.progressLabel}>
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  },
);

Progress.displayName = "Progress";
