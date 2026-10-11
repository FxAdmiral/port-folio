const prisma = require('../lib/prisma');

/**
 * Data-access layer for the Comment table.
 * Controllers call these instead of touching prisma.comment directly.
 */

function findManyByPost({ postId, skip, take }) {
  return prisma.comment.findMany({
    where: { postId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
    skip,
    take,
  });
}

function countByPost(postId) {
  return prisma.comment.count({ where: { postId } });
}

function findById(id) {
  return prisma.comment.findUnique({ where: { id } });
}

function create({ text, postId, authorId }) {
  return prisma.comment.create({
    data: { text, postId, authorId },
    include: { author: { select: { id: true, name: true } } },
  });
}

function remove(id) {
  return prisma.comment.delete({ where: { id } });
}

function removeAllForPost(postId) {
  return prisma.comment.deleteMany({ where: { postId } });
}

module.exports = {
  findManyByPost,
  countByPost,
  findById,
  create,
  remove,
  removeAllForPost,
};