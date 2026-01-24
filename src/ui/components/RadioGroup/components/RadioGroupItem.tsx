import {
  forwardRef,
  useContext,
  type InputHTMLAttributes,
} from "react";
import s from "../RadioGroup.module.scss";
import { RadioGroupContext } from "./RadioGroupContext";

export interface RadioGroupItemProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "name"> {
  /**
   * The value of this radio button
   */
  value: string;
}

export const RadioGroupItem = forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, disabled: itemDisabled, ...props }, ref) => {
    const context = useContext(RadioGroupContext);

    if (!context) {
      throw new Error("RadioGroupItem must be used within a RadioGroup");
    }

    const { name, value: selectedValue, onValueChange, disabled: groupDisabled } = context;
    const isDisabled = itemDisabled ?? groupDisabled;
    const isChecked = selectedValue === value;

    const handleChange = () => {
      if (!isDisabled && onValueChange) {
        onValueChange(value);
      }
    };

    return (
      <div className={s.radioItemWrapper}>
        <input
          ref={ref}
          type="radio"
          name={name}
          value={value}
          checked={isChecked}
          disabled={isDisabled}
          onChange={handleChange}
          className={s.radioInput}
          {...props}
        />
        <div
          className={[
            s.radioIndicator,
            isChecked ? s.checked : "",
            isDisabled ? s.disabled : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {isChecked && <div className={s.radioDot} />}
        </div>
      </div>
    );
  },
);

RadioGroupItem.displayName = "RadioGroupItem";
