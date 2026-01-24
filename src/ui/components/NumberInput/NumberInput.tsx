import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import s from "./NumberInput.module.scss";

export interface NumberInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "prefix" | "size"
  > {
  /** Content to show before the input (e.g., icon or label) */
  prefix?: ReactNode;
  /** Content to show after the input (e.g., unit like "px" or "%") */
  suffix?: ReactNode;
  /** Size variant */
  size?: "sm" | "md";
  /** Whether the input is in an error state */
  error?: boolean;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      prefix,
      suffix,
      size = "md",
      error = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    const hasAddons = Boolean(prefix) || Boolean(suffix);

    const inputElement = (
      <input
        ref={ref}
        type="number"
        className={[
          s.input,
          s[size],
          error ? s.error : "",
          hasAddons ? s.withAddons : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        {...props}
      />
    );

    if (!hasAddons) {
      return inputElement;
    }

    return (
      <div
        className={[s.inputGroup, s[size], disabled ? s.disabled : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {prefix && <span className={s.addon}>{prefix}</span>}
        {inputElement}
        {suffix && (
          <span className={[s.addon, s.suffix].join(" ")}>{suffix}</span>
        )}
      </div>
    );
  },
);

NumberInput.displayName = "NumberInput";
