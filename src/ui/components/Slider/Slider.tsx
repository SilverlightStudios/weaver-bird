import React, { forwardRef, useState, useRef, useCallback, type HTMLAttributes } from "react";
import s from "./Slider.module.scss";

export interface SliderProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  min?: number;
  max?: number;
  step?: number;
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
}

export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value: controlledValue,
      defaultValue = [50],
      onValueChange,
      disabled = false,
      orientation = "horizontal",
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    const trackRef = useRef<HTMLDivElement>(null);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    const handleValueChange = useCallback((newValue: number[]) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    }, [isControlled, onValueChange]);

    const getValueFromPosition = useCallback((clientX: number, clientY: number): number => {
      if (!trackRef.current) return 0;

      const rect = trackRef.current.getBoundingClientRect();
      let percentage: number;

      if (orientation === "horizontal") {
        percentage = (clientX - rect.left) / rect.width;
      } else {
        percentage = 1 - (clientY - rect.top) / rect.height;
      }

      percentage = Math.max(0, Math.min(1, percentage));
      const rawValue = min + percentage * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      return Math.max(min, Math.min(max, steppedValue));
    }, [orientation, min, max, step]);

    const handlePointerDown = (index: number) => (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      setDraggingIndex(index);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = useCallback((e: PointerEvent) => {
      if (draggingIndex === null || disabled) return;

      const newValue = getValueFromPosition(e.clientX, e.clientY);
      const updatedValues = [...value];
      updatedValues[draggingIndex] = newValue;
      handleValueChange(updatedValues.sort((a, b) => a - b));
    }, [draggingIndex, disabled, getValueFromPosition, value, handleValueChange]);

    const handlePointerUp = useCallback((e: PointerEvent) => {
      if (draggingIndex === null) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDraggingIndex(null);
    }, [draggingIndex]);

    React.useEffect(() => {
      if (draggingIndex === null) return;

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);

      return () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
      };
    }, [draggingIndex, handlePointerMove, handlePointerUp]);

    const getPercentage = (val: number): number => {
      return ((val - min) / (max - min)) * 100;
    };

    const orientationClass = orientation === "vertical" ? s.vertical : s.horizontal;

    return (
      <div
        ref={ref}
        className={[s.slider, orientationClass, disabled ? s.disabled : "", className]
          .filter(Boolean)
          .join(" ")}
        data-orientation={orientation}
        {...props}
      >
        <div ref={trackRef} className={s.track}>
          {/* Filled range */}
          {value.length === 1 && (
            <div
              className={s.range}
              style={{
                [orientation === "horizontal" ? "width" : "height"]: `${getPercentage(value[0])}%`,
              }}
            />
          )}
          {value.length === 2 && (
            <div
              className={s.range}
              style={{
                [orientation === "horizontal" ? "left" : "bottom"]: `${getPercentage(value[0])}%`,
                [orientation === "horizontal" ? "width" : "height"]: `${getPercentage(value[1]) - getPercentage(value[0])}%`,
              }}
            />
          )}

          {/* Thumbs */}
          {value.map((val, index) => (
            <div
              key={index}
              className={s.thumb}
              style={{
                [orientation === "horizontal" ? "left" : "bottom"]: `${getPercentage(val)}%`,
              }}
              onPointerDown={handlePointerDown(index)}
              role="slider"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={val}
              aria-orientation={orientation}
              tabIndex={disabled ? -1 : 0}
            />
          ))}
        </div>
      </div>
    );
  },
);

Slider.displayName = "Slider";
