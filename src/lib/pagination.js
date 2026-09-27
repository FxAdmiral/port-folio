const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/**
 * Parses ?page and ?limit query params into safe, bounded integers,
 * and returns the Prisma skip/take values that go with them.
 * Falls back to page 1 / DEFAULT_PAGE_SIZE for anything missing or invalid,
 * and caps limit at MAX_PAGE_SIZE so a client can't request the entire table.
 */
function parsePagination(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_PAGE_SIZE;
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;

  return { page, limit, skip: (page - 1) * limit };
}

function buildPaginationMeta(page, limit, totalCount) {
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);
  return {
    page,
    limit,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = { parsePagination, buildPaginationMeta, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };