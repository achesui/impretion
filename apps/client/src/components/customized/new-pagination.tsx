import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";

import { Pagination } from "../ui/pagination";

export const NewPagination = ({
  totalItems,
  totalPerPage,
  currentPage,
  onPageChange,
}: {
  totalItems: number;
  totalPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) => {
  const totalPages = Math.ceil(totalItems / totalPerPage)
    ? Math.ceil(totalItems / totalPerPage)
    : 1;
  const maxVisiblePages = 4;

  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages + 2) {
      // Mostrar todas las páginas si son pocas
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: number[] = [];
    pages.push(1); // Primera página

    const start = Math.max(2, currentPage - 1); // Inicio del rango
    const end = Math.min(totalPages - 1, currentPage + 1); // Fin del rango

    if (start > 2) {
      pages.push(-1); // Ellipsis antes
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push(-1); // Ellipsis después
    }

    pages.push(totalPages); // Última página

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) onPageChange(currentPage - 1);
            }}
          />
        </PaginationItem>

        {visiblePages.map((page, index) =>
          page === -1 ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={`page-${page}`}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(page);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) onPageChange(currentPage + 1);
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
