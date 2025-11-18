import { useCallback } from "react";
import { openFolderDialog } from "@lib/tauri";
import Button from "@/ui/components/buttons/Button";
import s from "./styles.module.scss";

interface Props {
  outputDir?: string;
  packFormat?: number;
  onOutputDirChange: (path: string) => void;
  onPackFormatChange: (format: number) => void;
}

export default function OutputSettings({
  outputDir,
  packFormat = 48,
  onOutputDirChange,
  onPackFormatChange,
}: Props) {
  const handleBrowse = useCallback(async () => {
    try {
      const selected = await openFolderDialog();
      if (selected) {
        onOutputDirChange(selected);
      }
    } catch (error) {
      console.error("Failed to open folder dialog:", error);
    }
  }, [onOutputDirChange]);

  return (
    <div className={s.root}>
      <div className={s.section}>
        <label className={s.label}>Output Directory (Weaver Nest)</label>
        <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
          <input
            type="text"
            className={s.input}
            value={outputDir || ""}
            onChange={(e) => onOutputDirChange(e.target.value)}
            placeholder="Select output directory..."
            readOnly
          />
          <Button
            className={s.button}
            onClick={handleBrowse}
            variant="secondary"
            size="md"
          >
            Browse
          </Button>
        </div>
      </div>

      <div className={s.section}>
        <label className={s.label}>Pack Format</label>
        <input
          type="number"
          className={s.input}
          value={packFormat}
          onChange={(e) => onPackFormatChange(Number(e.target.value))}
          min="1"
          max="999"
        />
      </div>
    </div>
  );
}
