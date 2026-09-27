const prisma = require('../lib/prisma');
const { parsePagination, buildPaginationMeta } = require('../lib/pagination');

async function getCommentsForPost(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const { page, limit, skip } = parsePagination(req.query);

    const [comments, totalCount] = await Promise.all([
      prisma.comment.findMany({
        where: { postId },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where: { postId } }),
    ]);

    res.json({ comments, pagination: buildPaginationMeta(page, limit, totalCount) });
  } catch (err) {
    next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const { text } = req.body;

    if (!text) return res.status(400).json({ error: 'text is required' });

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = await prisma.comment.create({
      data: { text, postId, authorId: req.user.id },
      include: { author: { select: { id: true, name: true } } },
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

async function deleteComment(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const existing = await prisma.comment.findUnique({ where: { id: commentId } });

    if (!existing) return res.status(404).json({ error: 'Comment not found' });
    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCommentsForPost, addComment, deleteComment };