import React from "react";
import { ZoneId } from "./types";
import { RESIZE_DOT_SIZE } from "./constants";
import { getResizeHandleBaseStyle, getResizeHandleZoneStyle } from "./utils";

interface ResizeHandleProps {
  zone: ZoneId;
  onMouseDown: (e: React.MouseEvent) => void;
}

const ResizeDot = () => (
  <div
    style={{
      width: `${RESIZE_DOT_SIZE}px`,
      height: `${RESIZE_DOT_SIZE}px`,
      borderRadius: "50%",
      background: "var(--color-border)",
    }}
  />
);

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  zone,
  onMouseDown,
}) => {
  const style = {
    ...getResizeHandleBaseStyle(),
    ...getResizeHandleZoneStyle(zone),
  };

  return (
    <div style={style} onMouseDown={onMouseDown}>
      <ResizeDot />
      <ResizeDot />
      <ResizeDot />
    </div>
  );
};
