const postModel = require('../models/postModel');
const commentModel = require('../models/commentModel');
const { parsePagination, buildPaginationMeta } = require('../lib/pagination');

async function getAllPosts(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const where = {
      published: true,
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [posts, totalCount] = await Promise.all([
      postModel.findMany({ where, skip, take: limit }),
      postModel.count(where),
    ]);

    res.json({
      posts,
      pagination: buildPaginationMeta(page, limit, totalCount),
      ...(search && { search }),
    });
  } catch (err) {
    next(err);
  }
}

async function getPostById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const post = await postModel.findById(id);

    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ post });
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    const { title, content, published } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const post = await postModel.create({
      title,
      content,
      published: published !== undefined ? Boolean(published) : true,
      authorId: req.user.id,
    });

    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
}

async function updatePost(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await postModel.findOwnerCheckById(id);

    if (!existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    const { title, content, published } = req.body;
    const post = await postModel.update(id, {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(published !== undefined && { published: Boolean(published) }),
    });

    res.json({ post });
  } catch (err) {
    next(err);
  }
}

async function deletePost(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await postModel.findOwnerCheckById(id);

    if (!existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await commentModel.removeAllForPost(id);
    await postModel.remove(id);

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllPosts, getPostById, createPost, updatePost, deletePost };