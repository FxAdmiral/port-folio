const prisma = require('../lib/prisma');
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
      prisma.post.findMany({
        where,
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
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
    const post = await prisma.post.findUnique({
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

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published: published !== undefined ? Boolean(published) : true,
        authorId: req.user.id,
      },
    });

    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
}

async function updatePost(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.post.findUnique({ where: { id } });

    if (!existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    const { title, content, published } = req.body;
    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(published !== undefined && { published: Boolean(published) }),
      },
    });

    res.json({ post });
  } catch (err) {
    next(err);
  }
}

async function deletePost(req, res, next) {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.post.findUnique({ where: { id } });

    if (!existing) return res.status(404).json({ error: 'Post not found' });
    if (existing.authorId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    await prisma.comment.deleteMany({ where: { postId: id } });
    await prisma.post.delete({ where: { id } });

    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllPosts, getPostById, createPost, updatePost, deletePost };