import api from "./api";

const MAX_PAGE_SIZE = 100;
const MAX_CONCURRENT_PAGES = 5;

export async function fetchAllPages(path, collectionKey) {
  const limit = MAX_PAGE_SIZE;
  const firstResponse = await api.get(path, { params: { page: 1, limit } });
  const firstData = firstResponse.data || {};
  const totalPages = Math.max(1, Number(firstData.totalPages) || 1);
  const responses = [firstResponse];

  for (let firstPage = 2; firstPage <= totalPages; firstPage += MAX_CONCURRENT_PAGES) {
    const lastPage = Math.min(totalPages, firstPage + MAX_CONCURRENT_PAGES - 1);
    const pageResponses = await Promise.all(
      Array.from({ length: lastPage - firstPage + 1 }, (_, index) =>
        api.get(path, { params: { page: firstPage + index, limit } })
      )
    );
    responses.push(...pageResponses);
  }

  return responses.flatMap((response) => {
    const data = response.data || {};
    const records = data[collectionKey] ?? data.data ?? [];
    return Array.isArray(records) ? records : [];
  });
}
