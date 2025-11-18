import { useCallback } from "react";
import { buildWeaverNest, formatError } from "@lib/tauri";
import type { OverrideWirePayload } from "@state";
import Button from "@/ui/components/buttons/Button";
import s from "./styles.module.scss";

interface Progress {
  phase: string;
  completed: number;
  total: number;
  bytes?: number;
}

interface Props {
  isLoading?: boolean;
  progress?: Progress;
  disabled?: boolean;
  packsDir?: string;
  packOrder: string[];
  overrides: Record<string, OverrideWirePayload>;
  outputDir?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function SaveBar({
  isLoading = false,
  progress,
  disabled = false,
  packsDir = "",
  packOrder,
  overrides,
  outputDir = "",
  onSuccess,
  onError,
}: Props) {
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
        size="lg"
        fullWidth
      >
        {isLoading ? "Saving..." : "Save to Weaver Nest"}
      </Button>

      {progress && (
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
      )}
    </div>
  );
}
