import React from "react";
import s from "./Tab.module.scss";
import { ZoneId } from "../../types";

interface TabProps {
  zone: ZoneId;
  label: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  isDragging: boolean;
  isHovered?: boolean;
  onClick: () => void;
}

export const Tab: React.FC<TabProps> = ({
  zone,
  label,
  icon,
  color,
  isActive,
  isDragging,
  isHovered,
  onClick,
}) => {
  const className = [
    s.tab,
    isActive && s.active,
    isDragging && s.dragging,
    isHovered && s.hovered,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      onClick={onClick}
      className={className}
      data-zone={zone}
      title={label}
      style={{ backgroundColor: color }}
    >
      {icon ? <img src={icon} alt={label} /> : <span>{label[0]}</span>}
    </div>
  );
};
