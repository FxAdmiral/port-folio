const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getCommentsForPost,
  addComment,
  deleteComment,
} = require('../controllers/commentController');
const { requireAuth } = require('../middleware/auth');

// @route   GET /api/posts/:postId/comments          (public)
router.get('/', getCommentsForPost);

// @route   POST /api/posts/:postId/comments         (protected)
router.post('/', requireAuth, addComment);

// @route   DELETE /api/posts/:postId/comments/:commentId  (protected, owner only)
router.delete('/:commentId', requireAuth, deleteComment);

module.exports = router;