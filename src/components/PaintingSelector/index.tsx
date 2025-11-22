import { useMemo } from "react";
import { Combobox, type ComboboxOption } from "@/ui/components/Combobox/Combobox";
import { beautifyAssetName } from "@lib/assetUtils";
import s from "./styles.module.scss";

interface Props {
  assetId?: string;
  allAssets: Array<{ id: string; name: string }>;
  onSelectPainting: (paintingId: string) => void;
}

export default function PaintingSelector({
  assetId,
  allAssets,
  onSelectPainting,
}: Props) {
  // Filter all assets to only paintings and create options
  const paintingOptions: ComboboxOption[] = useMemo(() => {
    return allAssets
      .filter((asset) => {
        const path = asset.id.includes(":") ? asset.id.split(":")[1] : asset.id;
        return path.startsWith("painting/");
      })
      .map((asset) => {
        // Extract just the painting name without the "painting/" prefix
        const path = asset.id.includes(":") ? asset.id.split(":")[1] : asset.id;
        const paintingName = path.replace("painting/", "");
        // Capitalize and format the name (e.g., "alban" -> "Alban", "aztec_2" -> "Aztec 2")
        const formattedName = paintingName
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        return {
          value: asset.id,
          label: formattedName,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allAssets]);

  // Don't render if no painting options are available
  if (paintingOptions.length === 0) {
    return null;
  }

  return (
    <div className={s.root}>
      <label className={s.label} htmlFor="painting-select">
        Painting Variant
      </label>
      <Combobox
        options={paintingOptions}
        value={assetId}
        onValueChange={onSelectPainting}
        placeholder="Select a painting..."
        searchPlaceholder="Search paintings..."
        emptyMessage="No paintings found"
        className={s.combobox}
      />
      <div className={s.hint}>
        {paintingOptions.length} painting{paintingOptions.length !== 1 ? "s" : ""} available
      </div>
    </div>
  );
}
