import { forwardRef, type HTMLAttributes } from "react";
import s from "../Pagination.module.scss";

export type PaginationContentProps = HTMLAttributes<HTMLUListElement>;

export const PaginationContent = forwardRef<
  HTMLUListElement,
  PaginationContentProps
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={[s.paginationContent, className].filter(Boolean).join(" ")}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";
