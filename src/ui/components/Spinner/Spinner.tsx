import { forwardRef, type HTMLAttributes } from "react";
import s from "./Spinner.module.scss";

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClass = s[size];

    return (
      <div
        ref={ref}
        role="status"
        aria-label="Loading"
        className={[s.spinner, sizeClass, className].filter(Boolean).join(" ")}
        {...props}
      >
        {/* Minecraft-style chunky blocks spinning */}
        <div className={s.inner}>
          <div className={s.block} data-position="1" />
          <div className={s.block} data-position="2" />
          <div className={s.block} data-position="3" />
          <div className={s.block} data-position="4" />
        </div>
        <span className="sr-only">Loading...</span>
      </div>
    );
  },
);

Spinner.displayName = "Spinner";
