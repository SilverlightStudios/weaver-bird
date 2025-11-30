import { getCurrentWindow } from "@tauri-apps/api/window";
import s from "./WindowControls.module.scss";

export const WindowControls = () => {
  const handleMinimize = () => {
    const appWindow = getCurrentWindow();
    appWindow.minimize();
  };

  const handleMaximize = () => {
    const appWindow = getCurrentWindow();
    appWindow.toggleMaximize();
  };

  const handleClose = () => {
    const appWindow = getCurrentWindow();
    appWindow.close();
  };

  return (
    <div className={s.windowControls}>
      <button
        className={`${s.windowButton} ${s.close}`}
        onClick={handleClose}
        aria-label="Close window"
        title="Close"
      />
      <button
        className={`${s.windowButton} ${s.minimize}`}
        onClick={handleMinimize}
        aria-label="Minimize window"
        title="Minimize"
      />
      <button
        className={`${s.windowButton} ${s.maximize}`}
        onClick={handleMaximize}
        aria-label="Maximize window"
        title="Maximize"
      />
    </div>
  );
};
