import type { ViewMode } from "../types";
import s from "../styles.module.scss";

interface NoVariantsProps {
  viewMode: ViewMode;
}

export function NoVariantsDisplay({ viewMode }: NoVariantsProps) {
  return (
    <div className={s.noVariants}>
      No {viewMode === "world" ? "world" : "inventory"} variants available
    </div>
  );
}
