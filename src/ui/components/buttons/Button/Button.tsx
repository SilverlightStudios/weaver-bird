import {
  forwardRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import s from "./styles.module.scss";
import { ButtonIcon } from "./ButtonIcon";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";
export type ButtonIconLocation = "leading" | "following" | "above" | "below";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  renderIcon?: () => ReactNode;
  iconLocation?: ButtonIconLocation;
  color?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      type = "button",
      fullWidth = false,
      renderIcon,
      iconLocation = "leading",
      disabled,
      color,
      ...rest
    },
    ref,
  ) => {
    const icon = renderIcon?.();
    const { style, ...restProps } = rest;
    const accent = color ?? "var(--color-primary)";

    const mergedStyle = {
      ...(style ?? {}),
      "--button-accent": accent,
    } as CSSProperties;

    const rootClassName = [s.button, fullWidth ? s.fullWidth : "", className]
      .filter(Boolean)
      .join(" ");

    const content = icon ? (
      <ButtonIcon icon={icon} location={iconLocation}>
        {children}
      </ButtonIcon>
    ) : (
      <span className={s.content}>
        {children && <span className={s.label}>{children}</span>}
      </span>
    );

    return (
      <button
        ref={ref}
        type={type}
        className={rootClassName}
        data-icon-location={icon ? iconLocation : undefined}
        data-variant={variant}
        data-size={size}
        style={mergedStyle}
        disabled={disabled}
        {...restProps}
      >
        {content}
        <span className={s.activeOutline} aria-hidden="true" />
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
