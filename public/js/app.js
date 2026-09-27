const API = '/api';
const app = document.getElementById('app');
const apiStatusEl = document.getElementById('apiStatus');

// ---------- Auth state helpers ----------
function getToken() { return localStorage.getItem('token'); }
function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  refreshNav();
}
function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  refreshNav();
}
function refreshNav() {
  const user = getUser();
  document.body.classList.toggle('authed', Boolean(user));
  const userSpan = document.querySelector('.nav-user');
  if (userSpan) userSpan.textContent = user ? user.name : '';
}

// ---------- API helper ----------
async function api(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (!token) throw new Error('You need to log in first.');
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------- Health check ----------
(async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    apiStatusEl.textContent = res.ok ? 'online' : 'unreachable';
  } catch {
    apiStatusEl.textContent = 'unreachable';
  }
})();

// ---------- Small render helpers ----------
function escapeHtml(str = '') {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function excerpt(text, len = 160) {
  return text.length > len ? text.slice(0, len).trim() + '…' : text;
}

// ---------- Views ----------
async function viewHome() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const page = Math.max(parseInt(params.get('page'), 10) || 1, 1);
  const search = params.get('search') || '';

  app.innerHTML = `
    <div class="intro">
      <h1>Notes worth publishing</h1>
      <p>A small blog/CMS API, built to be poked at. Every post below is live data from the deployed backend.</p>
    </div>
    <form id="searchForm" class="search-form">
      <input type="search" id="searchInput" placeholder="Search posts by title or content…" value="${escapeHtml(search)}" />
      <button class="btn btn-quiet" type="submit">Search</button>
      ${search ? `<a href="#/" class="clear-search">Clear</a>` : ''}
    </form>
    <ul class="post-list" id="postList"><li class="empty-state">Loading posts…</li></ul>
    <div class="pager" id="pager"></div>
  `;

  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = document.getElementById('searchInput').value.trim();
    location.hash = q ? `#/?search=${encodeURIComponent(q)}&page=1` : '#/';
  });

  try {
    const query = new URLSearchParams({ page: String(page), limit: '10' });
    if (search) query.set('search', search);
    const { posts, pagination } = await api(`/posts?${query.toString()}`);
    const listEl = document.getElementById('postList');

    if (!posts.length) {
      listEl.innerHTML = `<li class="empty-state">${
        search
          ? `No posts match "${escapeHtml(search)}".`
          : page > 1
            ? 'No more posts.'
            : `No posts yet. ${getUser() ? '<a href="#/new">Write the first one.</a>' : 'Log in to write the first one.'}`
      }</li>`;
    } else {
      listEl.innerHTML = posts.map((p) => `
        <li class="post-item">
          <a class="post-title" href="#/post/${p.id}">${escapeHtml(p.title)}</a>
          <p class="post-meta">${escapeHtml(p.author.name)} · ${formatDate(p.createdAt)} · ${p._count.comments} comment${p._count.comments === 1 ? '' : 's'}</p>
          <p class="post-excerpt">${escapeHtml(excerpt(p.content))}</p>
        </li>
      `).join('');
    }

    document.getElementById('pager').innerHTML = `
      <div class="pager-inner">
        <button class="btn btn-quiet" id="prevPage" ${pagination.hasPrevPage ? '' : 'disabled'}>← Previous</button>
        <span class="pager-status">Page ${pagination.page} of ${pagination.totalPages} · ${pagination.totalCount} post${pagination.totalCount === 1 ? '' : 's'}${search ? ' found' : ' total'}</span>
        <button class="btn btn-quiet" id="nextPage" ${pagination.hasNextPage ? '' : 'disabled'}>Next →</button>
      </div>
    `;
    const hashFor = (p) => {
      const q = new URLSearchParams();
      q.set('page', String(p));
      if (search) q.set('search', search);
      return `#/?${q.toString()}`;
    };
    document.getElementById('prevPage').addEventListener('click', () => { if (pagination.hasPrevPage) location.hash = hashFor(pagination.page - 1); });
    document.getElementById('nextPage').addEventListener('click', () => { if (pagination.hasNextPage) location.hash = hashFor(pagination.page + 1); });
  } catch (err) {
    document.getElementById('postList').innerHTML = `<li class="empty-state">Couldn't load posts: ${escapeHtml(err.message)}</li>`;
  }
}

async function viewPost(id) {
  app.innerHTML = `<a href="#/" class="back-link">← Back to all posts</a><div id="postDetail">Loading…</div>`;
  const el = document.getElementById('postDetail');
  try {
    const { post } = await api(`/posts/${id}`);
    const user = getUser();
    const isOwner = user && user.id === post.authorId;
    const totalComments = post._count.comments;
    const hasMoreComments = totalComments > post.comments.length;

    el.className = 'post-detail';
    el.innerHTML = `
      <h1 class="post-title">${escapeHtml(post.title)}</h1>
      <p class="post-meta">${escapeHtml(post.author.name)} · ${formatDate(post.createdAt)}</p>
      ${isOwner ? `
        <div class="post-owner-actions">
          <button class="btn btn-quiet" id="deletePostBtn">Delete post</button>
        </div>` : ''}
      <div class="post-body">${escapeHtml(post.content)}</div>
      <section class="comments-section">
        <h2 class="comments-heading">${totalComments} comment${totalComments === 1 ? '' : 's'}</h2>
        <div id="commentList">
          ${post.comments.map(commentHtml).join('') || '<p class="post-meta">No comments yet.</p>'}
        </div>
        ${hasMoreComments ? `<button class="btn btn-quiet" id="loadMoreComments" style="margin-top:12px;">Load more comments</button>` : ''}
        ${user ? `
          <form id="commentForm" style="margin-top:20px;">
            <div class="field">
              <label for="commentText">Add a comment</label>
              <textarea id="commentText" required style="min-height:80px;"></textarea>
            </div>
            <button class="btn" type="submit">Post comment</button>
          </form>
        ` : `<p class="post-meta"><a href="#/login">Log in</a> to leave a comment.</p>`}
      </section>
    `;

    if (isOwner) {
      document.getElementById('deletePostBtn').addEventListener('click', async () => {
        if (!confirm('Delete this post? This cannot be undone.')) return;
        try {
          await api(`/posts/${id}`, { method: 'DELETE', auth: true });
          location.hash = '#/';
        } catch (err) {
          alert(err.message);
        }
      });
    }

    const loadMoreBtn = document.getElementById('loadMoreComments');
    if (loadMoreBtn) {
      let loadedPage = 1; // page 1 is the 20 already shown from the post payload
      loadMoreBtn.addEventListener('click', async () => {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading…';
        try {
          loadedPage += 1;
          const { comments, pagination } = await api(`/posts/${id}/comments?page=${loadedPage}&limit=20`);
          document.getElementById('commentList').insertAdjacentHTML('beforeend', comments.map(commentHtml).join(''));
          attachCommentDeleteHandlers(id);
          if (!pagination.hasNextPage) {
            loadMoreBtn.remove();
          } else {
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = 'Load more comments';
          }
        } catch (err) {
          alert(err.message);
          loadMoreBtn.disabled = false;
          loadMoreBtn.textContent = 'Load more comments';
        }
      });
    }

    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('commentText').value.trim();
        if (!text) return;
        try {
          await api(`/posts/${id}/comments`, { method: 'POST', auth: true, body: { text } });
          viewPost(id); // reload
        } catch (err) {
          alert(err.message);
        }
      });
    }

    attachCommentDeleteHandlers(id);
  } catch (err) {
    el.innerHTML = `<p class="empty-state">Couldn't load this post: ${escapeHtml(err.message)}</p>`;
  }
}

function attachCommentDeleteHandlers(postId) {
  document.querySelectorAll('.comment-delete').forEach((btn) => {
    if (btn.dataset.bound) return; // avoid double-binding on re-render
    btn.dataset.bound = '1';
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      if (!confirm('Delete this comment?')) return;
      try {
        await api(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE', auth: true });
        viewPost(postId);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function commentHtml(c) {
  const user = getUser();
  const canDelete = user && user.id === c.authorId;
  return `
    <div class="comment-item">
      <p class="comment-meta">${escapeHtml(c.author.name)} · ${formatDate(c.createdAt)}</p>
      <p class="comment-text">${escapeHtml(c.text)}</p>
      ${canDelete ? `<button class="comment-delete" data-comment-id="${c.id}">Delete</button>` : ''}
    </div>
  `;
}

function viewLogin() {
  app.innerHTML = `
    <div class="form-panel">
      <h1>Log in</h1>
      <div id="formAlert"></div>
      <form id="loginForm">
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" required />
        </div>
        <button class="btn" type="submit">Log in</button>
      </form>
      <p class="form-footnote">No account yet? <a href="#/register">Register</a></p>
    </div>
  `;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try {
      const { user, token } = await api('/auth/login', { method: 'POST', body: { email, password } });
      setSession(token, user);
      location.hash = '#/';
    } catch (err) {
      showFormAlert(err.message);
    }
  });
}

function viewRegister() {
  app.innerHTML = `
    <div class="form-panel">
      <h1>Create an account</h1>
      <div id="formAlert"></div>
      <form id="registerForm">
        <div class="field">
          <label for="name">Name</label>
          <input type="text" id="name" required />
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" minlength="6" required />
        </div>
        <button class="btn" type="submit">Register</button>
      </form>
      <p class="form-footnote">Already have an account? <a href="#/login">Log in</a></p>
    </div>
  `;
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    try {
      const { user, token } = await api('/auth/register', { method: 'POST', body: { name, email, password } });
      setSession(token, user);
      location.hash = '#/';
    } catch (err) {
      showFormAlert(err.message);
    }
  });
}

function viewNewPost() {
  if (!getUser()) { location.hash = '#/login'; return; }
  app.innerHTML = `
    <div class="form-panel">
      <h1>Write a post</h1>
      <div id="formAlert"></div>
      <form id="newPostForm">
        <div class="field">
          <label for="title">Title</label>
          <input type="text" id="title" required />
        </div>
        <div class="field">
          <label for="content">Content</label>
          <textarea id="content" required></textarea>
        </div>
        <button class="btn" type="submit">Publish</button>
      </form>
    </div>
  `;
  document.getElementById('newPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    try {
      const { post } = await api('/posts', { method: 'POST', auth: true, body: { title, content } });
      location.hash = `#/post/${post.id}`;
    } catch (err) {
      showFormAlert(err.message);
    }
  });
}

function showFormAlert(message) {
  const el = document.getElementById('formAlert');
  if (el) el.innerHTML = `<div class="alert alert-error">${escapeHtml(message)}</div>`;
}

// ---------- Router ----------
function router() {
  const full = location.hash || '#/';
  const path = full.split('?')[0];
  const postMatch = path.match(/^#\/post\/(\d+)$/);

  if (path === '#/') return viewHome();
  if (path === '#/login') return viewLogin();
  if (path === '#/register') return viewRegister();
  if (path === '#/new') return viewNewPost();
  if (postMatch) return viewPost(postMatch[1]);
  return viewHome();
}

document.getElementById('logoutLink').addEventListener('click', (e) => {
  e.preventDefault();
  clearSession();
  location.hash = '#/';
});

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
  refreshNav();
  router();
});