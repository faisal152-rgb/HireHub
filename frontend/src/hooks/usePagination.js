import { useCallback, useState } from "react";

export function usePagination(initialPage = 1, initialLimit = 10) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const nextPage = useCallback(() => setPage((prev) => prev + 1), []);
  const prevPage = useCallback(() => setPage((prev) => Math.max(1, prev - 1)), []);
  const goToPage = useCallback(
    (p) => setPage(Math.max(1, Math.floor(Number(p) || 1))),
    []
  );

  return {
    page,
    limit,
    setLimit,
    nextPage,
    prevPage,
    goToPage,
  };
}

export default usePagination;
