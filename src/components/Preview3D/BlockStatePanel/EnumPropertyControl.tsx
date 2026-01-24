/**
 * Enum property control component
 */
import { Select, type SelectOption } from "@/ui/components/Select/Select";
import type { PropertyControlProps } from "./PropertyControlTypes";
import s from "../BlockStatePanel.module.scss";

export function EnumPropertyControl({
  prop,
  currentValue,
  blockProps,
  onValueChange,
}: Pick<PropertyControlProps, "prop" | "currentValue" | "blockProps" | "onValueChange">) {
  const options: SelectOption[] = (prop.values ?? []).map((value) => ({
    value,
    label: value,
  }));

  const isFacingDisabled = prop.name === "facing" && blockProps?.wall === "false";

  return (
    <div key={prop.name} className={s.property}>
      <span className={s.propertyName}>{prop.name}</span>
      <Select
        options={options}
        value={currentValue}
        onValueChange={onValueChange}
        placeholder="Select..."
        emptyMessage="No options"
        className={s.select}
        disabled={isFacingDisabled}
      />
      {isFacingDisabled && (
        <div className={s.disabledHint}>
          Enable "wall" to set facing direction
        </div>
      )}
    </div>
  );
}
