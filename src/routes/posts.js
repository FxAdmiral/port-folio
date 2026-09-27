const express = require('express');
const router = express.Router();
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
} = require('../controllers/postController');
const { requireAuth } = require('../middleware/auth');
const commentRouter = require('./comments');

// @route   GET /api/posts            (public)
router.get('/', getAllPosts);

// @route   GET /api/posts/:id        (public)
router.get('/:id', getPostById);

// @route   POST /api/posts           (protected)
router.post('/', requireAuth, createPost);

// @route   PUT /api/posts/:id        (protected, owner only)
router.put('/:id', requireAuth, updatePost);

// @route   DELETE /api/posts/:id     (protected, owner only)
router.delete('/:id', requireAuth, deletePost);

// Nested comment routes: /api/posts/:postId/comments
router.use('/:postId/comments', commentRouter);

module.exports = router;