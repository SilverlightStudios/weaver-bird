/**
 * Pagination Hook
 *
 * Manages pagination state and info.
 */

import { useState } from "react";

export interface PaginationInfo {
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function usePagination() {
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  return {
    paginationInfo,
    setPaginationInfo,
  };
}
