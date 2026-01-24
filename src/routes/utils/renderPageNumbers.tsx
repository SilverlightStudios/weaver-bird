/**
 * Pagination Rendering Utility
 */

import {
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from "@/ui/components/Pagination";

export function renderPageNumbers(
  currentPage: number,
  totalPages: number,
  setCurrentPage: (page: number) => void,
) {
  const pageNumbers: JSX.Element[] = [];
  const maxVisiblePages = 4;

  pageNumbers.push(
    <PaginationItem key={1}>
      <PaginationLink
        onClick={() => setCurrentPage(1)}
        isActive={currentPage === 1}
      >
        1
      </PaginationLink>
    </PaginationItem>,
  );

  let startPage = Math.max(2, currentPage - 1);
  let endPage = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    endPage = Math.min(maxVisiblePages - 1, totalPages - 1);
  } else if (currentPage >= totalPages - 2) {
    startPage = Math.max(2, totalPages - maxVisiblePages + 2);
  }

  if (startPage > 2) {
    pageNumbers.push(
      <PaginationItem key="ellipsis-start">
        <PaginationEllipsis>...</PaginationEllipsis>
      </PaginationItem>,
    );
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(
      <PaginationItem key={i}>
        <PaginationLink
          onClick={() => setCurrentPage(i)}
          isActive={currentPage === i}
        >
          {i}
        </PaginationLink>
      </PaginationItem>,
    );
  }

  if (endPage < totalPages - 1) {
    pageNumbers.push(
      <PaginationItem key="ellipsis-end">
        <PaginationEllipsis>...</PaginationEllipsis>
      </PaginationItem>,
    );
  }

  if (totalPages > 1) {
    pageNumbers.push(
      <PaginationItem key={totalPages}>
        <PaginationLink
          onClick={() => setCurrentPage(totalPages)}
          isActive={currentPage === totalPages}
        >
          {totalPages}
        </PaginationLink>
      </PaginationItem>,
    );
  }

  return pageNumbers;
}
