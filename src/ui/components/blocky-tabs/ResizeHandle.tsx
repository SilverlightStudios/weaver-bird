import React from "react";
import type { ZoneId } from "./types";
import { getResizeHandleZoneStyle } from "./utils";
import { ResizeDot } from "./components/ResizeDot";
import s from "./BlockyTabs.module.scss";

interface ResizeHandleProps {
  zone: ZoneId;
  onMouseDown: (e: React.MouseEvent) => void;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  zone,
  onMouseDown,
}) => {
  const style = getResizeHandleZoneStyle(zone);

  return (
    <div className={s.resizeHandle} style={style} onMouseDown={onMouseDown}>
      <ResizeDot />
      <ResizeDot />
      <ResizeDot />
    </div>
  );
};
