import { useCallback } from "react";
import { buildWeaverNest, formatError } from "@lib/tauri";
import Button from "@/ui/components/buttons/Button";
import { SaveIcon } from "./SaveIcon";
import type { SaveBarProps } from "./types";
import { useStore } from "@state/store";
import s from "./styles.module.scss";

export const SaveBar = ({
  isLoading = false,
  progress,
  disabled = false,
  packsDir = "",
  packOrder,
  overrides,
  outputDir = "",
  onSuccess,
  onError,
  statusMessage,
  statusType = "idle",
  onClearStatus,
}: SaveBarProps) => {
  const jemDebugMode = useStore((state) => state.jemDebugMode);
  const setJemDebugMode = useStore((state) => state.setJemDebugMode);

  const percent = progress
    ? Math.round((progress.completed / Math.max(progress.total, 1)) * 100)
    : 0;

  const handleSave = useCallback(async () => {
    if (!packsDir || !outputDir) {
      onError?.("Please select both packs folder and output directory");
      return;
    }

    try {
      const result = await buildWeaverNest({
        packsDir,
        packOrder,
        overrides,
        outputDir,
      });
      console.warn("Save result:", result);
      onSuccess?.();
    } catch (error) {
      const errorMessage = formatError(error);
      console.error("Failed to save:", error);
      onError?.(errorMessage);
    }
  }, [packsDir, packOrder, overrides, outputDir, onSuccess, onError]);

  return (
    <div className={s.root}>
      <Button
        className={s.button}
        onClick={handleSave}
        disabled={isLoading || disabled}
        variant="primary"
        size="md"
        renderIcon={() => <SaveIcon />}
        iconLocation="leading"
      >
        {isLoading ? "Saving..." : "Save"}
      </Button>

      <div className={s.statusArea}>
        {progress ? (
          <div className={s.progress}>
            <div className={s.progressBar}>
              <div className={s.fill} style={{ width: `${percent}%` }} />
            </div>
            <span className={s.progressText}>
              {progress.phase} {progress.completed}/{progress.total}
              {progress.bytes &&
                ` (${(progress.bytes / 1024 / 1024).toFixed(1)} MB)`}
            </span>
          </div>
        ) : statusMessage ? (
          <div className={s.status} data-type={statusType}>
            <span className={s.statusText}>{statusMessage}</span>
            {onClearStatus && (
              <button
                className={s.clearButton}
                onClick={onClearStatus}
                aria-label="Clear status"
              >
                ×
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className={s.debugControls}>
        <label className={s.debugLabel}>
          <input
            type="checkbox"
            checked={jemDebugMode}
            onChange={(e) => setJemDebugMode(e.target.checked)}
            className={s.debugCheckbox}
          />
          <span>JEM Debug Mode</span>
        </label>
      </div>
    </div>
  );
};
