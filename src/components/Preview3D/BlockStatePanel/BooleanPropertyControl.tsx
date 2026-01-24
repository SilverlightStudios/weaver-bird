/**
 * Boolean property control component
 */
import type { PropertyControlProps } from "./PropertyControlTypes";
import s from "../BlockStatePanel.module.scss";

export function BooleanPropertyControl({
  prop,
  currentValue,
  onValueChange,
  maxAge,
  currentAge,
}: Pick<PropertyControlProps, "prop" | "currentValue" | "onValueChange" | "maxAge" | "currentAge">) {
  const ripeDisabled =
    prop.name === "ripe" &&
    maxAge !== undefined &&
    Number.isFinite(currentAge) &&
    currentAge! < maxAge;

  return (
    <label key={prop.name} className={s.property}>
      <span className={s.propertyName}>{prop.name}</span>
      <input
        type="checkbox"
        checked={currentValue === "true"}
        disabled={ripeDisabled}
        onChange={(e) => onValueChange(e.target.checked ? "true" : "false")}
        className={s.checkbox}
      />
    </label>
  );
}
