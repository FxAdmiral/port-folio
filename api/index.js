require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('../src/routes/auth');
const postRoutes = require('../src/routes/posts');
const errorHandler = require('../src/middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend (public/index.html, css, js) at the root of the site
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check — useful as a first "Send" in Postman to prove the deployment is alive
app.get('/api/health', (req, res) => {
  res.json({
    message: 'Blog CMS API is live 🚀',
    docs: 'See README.md for the full endpoint list, or the public Postman collection.',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// 404 handler for unmatched API routes (falls through after static + routes above)
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Central error handler (must be last)
app.use(errorHandler);

// Render (and local dev) run this as a normal, always-on Node process.
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;