const postModel = require('../models/postModel');
const commentModel = require('../models/commentModel');
const { parsePagination, buildPaginationMeta } = require('../lib/pagination');

async function getCommentsForPost(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const { page, limit, skip } = parsePagination(req.query);

    const [comments, totalCount] = await Promise.all([
      commentModel.findManyByPost({ postId, skip, take: limit }),
      commentModel.countByPost(postId),
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

    const post = await postModel.findOwnerCheckById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = await commentModel.create({ text, postId, authorId: req.user.id });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}

async function deleteComment(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const existing = await commentModel.findById(commentId);

    if (!existing) return res.status(404).json({ error: 'Comment not found' });
    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await commentModel.remove(commentId);
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCommentsForPost, addComment, deleteComment };