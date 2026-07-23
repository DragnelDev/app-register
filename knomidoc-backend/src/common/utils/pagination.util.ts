export function paginationSkip(page = 1, pageSize = 10): number {
  const safePage = page && page > 0 ? page : 1;
  const safeSize = pageSize && pageSize > 0 ? pageSize : 10;
  return (safePage - 1) * safeSize;
}
