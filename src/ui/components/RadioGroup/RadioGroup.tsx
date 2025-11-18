import {
  createContext,
  forwardRef,
  useContext,
  type HTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import s from "./RadioGroup.module.scss";

interface RadioGroupContextValue {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | undefined>(
  undefined,
);

export interface RadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * The value of the selected radio button
   */
  value?: string;
  /**
   * The default value (uncontrolled)
   */
  defaultValue?: string;
  /**
   * Callback when the value changes
   */
  onValueChange?: (value: string) => void;
  /**
   * Name for the radio group (auto-generated if not provided)
   */
  name?: string;
  /**
   * Whether the radio group is disabled
   */
  disabled?: boolean;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      name,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const groupName = name || `radio-group-${Math.random().toString(36).slice(2)}`;

    return (
      <RadioGroupContext.Provider
        value={{
          name: groupName,
          value: value || defaultValue,
          onValueChange,
          disabled,
        }}
      >
        <div
          ref={ref}
          role="radiogroup"
          className={[s.radioGroup, className].filter(Boolean).join(" ")}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  },
);

RadioGroup.displayName = "RadioGroup";

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
    const isDisabled = itemDisabled || groupDisabled;
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
