import type { ReactNode } from "react";
import s from "./styles.module.scss";
import type { ButtonIconLocation } from "./Button";

interface ButtonIconProps {
  icon: ReactNode;
  location: ButtonIconLocation;
  children?: ReactNode;
}

export function ButtonIcon({ icon, location, children }: ButtonIconProps) {
  const isStacked = location === "above" || location === "below";
  const isLeading = location === "leading" || location === "above";

  const contentClassName = [
    s.content,
    isStacked ? s.stack : "",
    s.withIcon,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={contentClassName}>
      {isLeading && (
        <span className={s.icon} data-location={location}>
          {icon}
        </span>
      )}
      {children && <span className={s.label}>{children}</span>}
      {!isLeading && (
        <span className={s.icon} data-location={location}>
          {icon}
        </span>
      )}
    </span>
  );
}
