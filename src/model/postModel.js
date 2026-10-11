const prisma = require('../lib/prisma');

/**
 * Data-access layer for the Post table.
 * Controllers build the `where`/pagination values and pass them in here —
 * this file is the only place that talks to prisma.post directly.
 */

function findMany({ where, skip, take }) {
  return prisma.post.findMany({
    where,
    include: {
      author: { select: { id: true, name: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}

function count(where) {
  return prisma.post.count({ where });
}

function findById(id) {
  return prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 20, // first page of comments only — use GET /api/posts/:id/comments?page=2 for more
      },
      _count: { select: { comments: true } },
    },
  });
}

// A lightweight lookup (no includes) used for ownership checks before
// update/delete, so we don't pull comments/author along for the ride.
function findOwnerCheckById(id) {
  return prisma.post.findUnique({ where: { id } });
}

function create({ title, content, published, authorId }) {
  return prisma.post.create({
    data: { title, content, published, authorId },
  });
}

function update(id, data) {
  return prisma.post.update({ where: { id }, data });
}

function remove(id) {
  return prisma.post.delete({ where: { id } });
}

module.exports = {
  findMany,
  count,
  findById,
  findOwnerCheckById,
  create,
  update,
  remove,
};