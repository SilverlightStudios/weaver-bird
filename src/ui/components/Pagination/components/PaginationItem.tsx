import { forwardRef, type HTMLAttributes } from "react";
import s from "../Pagination.module.scss";

export type PaginationItemProps = HTMLAttributes<HTMLLIElement>;

export const PaginationItem = forwardRef<HTMLLIElement, PaginationItemProps>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      className={[s.paginationItem, className].filter(Boolean).join(" ")}
      {...props}
    />
  ),
);
PaginationItem.displayName = "PaginationItem";
