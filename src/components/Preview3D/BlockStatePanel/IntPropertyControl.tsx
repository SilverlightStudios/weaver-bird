/**
 * Integer property control component
 */
import { NumberInput } from "@/ui/components/NumberInput";
import { Slider } from "@/ui/components/Slider/Slider";
import type { PropertyControlProps } from "./PropertyControlTypes";
import { PROPERTY_DESCRIPTIONS } from "./PropertyControlTypes";
import s from "../BlockStatePanel.module.scss";

export function IntPropertyControl({
  prop,
  currentValue,
  onValueChange,
  sliderPreviewValues,
  onSliderPreviewChange,
}: Pick<PropertyControlProps, "prop" | "currentValue" | "onValueChange" | "sliderPreviewValues" | "onSliderPreviewChange">) {
  const min = prop.min ?? 0;
  const max = prop.max ?? 100;
  const range = max - min;
  const useSlider = range <= 15 && range > 0;
  const description = PROPERTY_DESCRIPTIONS[prop.name];
  const displayValue = sliderPreviewValues[prop.name] ?? currentValue;

  return (
    <div key={prop.name} className={s.propertyWithDescription}>
      {description && (
        <div className={s.propertyDescription}>{description}</div>
      )}
      <div className={s.property}>
        <span className={s.propertyName}>{prop.name}</span>
        {useSlider ? (
          <div className={s.sliderControl}>
            <Slider
              min={min}
              max={max}
              step={1}
              value={[parseInt(displayValue) || min]}
              onValueChange={(values) => {
                onSliderPreviewChange(prop.name, String(values[0]));
              }}
              onValueCommit={(values) => {
                onSliderPreviewChange(prop.name, null);
                onValueChange(String(values[0]));
              }}
              className={s.slider}
            />
            <span className={s.sliderValue}>{displayValue}</span>
          </div>
        ) : (
          <NumberInput
            value={currentValue}
            onChange={(e) => onValueChange(e.target.value)}
            min={min}
            max={max}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}
