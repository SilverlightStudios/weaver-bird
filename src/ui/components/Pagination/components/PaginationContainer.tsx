import { forwardRef, type HTMLAttributes } from "react";
import s from "../Pagination.module.scss";

export type PaginationProps = HTMLAttributes<HTMLElement>;

export const Pagination = forwardRef<HTMLElement, PaginationProps>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      role="navigation"
      aria-label="Pagination Navigation"
      className={[s.pagination, className].filter(Boolean).join(" ")}
      {...props}
    />
  ),
);
Pagination.displayName = "Pagination";
