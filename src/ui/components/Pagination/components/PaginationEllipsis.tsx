import { forwardRef, type HTMLAttributes } from "react";
import s from "../Pagination.module.scss";

export type PaginationEllipsisProps = HTMLAttributes<HTMLSpanElement>;

export const PaginationEllipsis = forwardRef<
  HTMLSpanElement,
  PaginationEllipsisProps
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    aria-hidden
    className={[s.paginationEllipsis, className].filter(Boolean).join(" ")}
    {...props}
  >
    <span className="sr-only">...</span>
  </span>
));
PaginationEllipsis.displayName = "PaginationEllipsis";
