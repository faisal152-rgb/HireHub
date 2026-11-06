import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Pagination.css";

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}) {
  if (!totalItems || totalItems < 1) return null;

  const pageCount = Math.max(1, totalPages || 1);
  const page = Math.min(Math.max(1, currentPage || 1), pageCount);
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav className="comp-pagination" aria-label="Pagination">
      <span className="comp-pagination-summary" aria-live="polite">
        Showing {firstItem}-{lastItem} of {totalItems}
      </span>
      <div className="comp-pagination-controls">
        <button
          type="button"
          className="comp-btn comp-btn-secondary comp-pagination-button"
          aria-label="Go to previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>
        <span className="comp-pagination-page" aria-current="page">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          className="comp-btn comp-btn-secondary comp-pagination-button"
          aria-label="Go to next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
