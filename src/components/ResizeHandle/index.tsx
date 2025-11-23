import { getCurrentWindow } from "@tauri-apps/api/window";
import s from "./ResizeHandle.module.scss";

const appWindow = getCurrentWindow();

export default function ResizeHandle() {
  const handleMouseDown = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await appWindow.startResizeDragging("SouthEast");
    } catch (error) {
      console.error("Failed to start resize dragging:", error);
    }
  };

  return (
    <div
      className={s.resizeHandle}
      onMouseDown={handleMouseDown}
      aria-label="Resize window"
      title="Resize window"
    >
      <div className={s.resizeIndicator}>
        <span className={s.gripLine}></span>
        <span className={s.gripLine}></span>
        <span className={s.gripLine}></span>
      </div>
    </div>
  );
}
