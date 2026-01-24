import {
  forwardRef,
  useId,
  type HTMLAttributes,
} from "react";
import s from "../RadioGroup.module.scss";
import { RadioGroupContext } from "./RadioGroupContext";

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
    const id = useId();
    const groupName = name ?? `radio-group-${id}`;

    return (
      <RadioGroupContext.Provider
        value={{
          name: groupName,
          value: value ?? defaultValue,
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
