const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../db/database');

// GET all pages (tree structure)
router.get('/', (req, res) => {
  try {
    const { archived } = req.query;
    const isArchived = archived === 'true' ? 1 : 0;
    const pages = query(
      `SELECT p.*, GROUP_CONCAT(t.name) as tag_names, GROUP_CONCAT(t.id) as tag_ids, GROUP_CONCAT(t.color) as tag_colors
       FROM pages p
       LEFT JOIN page_tags pt ON p.id = pt.page_id
       LEFT JOIN tags t ON pt.tag_id = t.id
       WHERE p.is_archived = ?
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [isArchived]
    );
    
    // Build tree
    const pageMap = {};
    const roots = [];
    pages.forEach(p => {
      p.tags = parseTags(p);
      p.children = [];
      pageMap[p.id] = p;
    });
    pages.forEach(p => {
      if (p.parent_id && pageMap[p.parent_id]) {
        pageMap[p.parent_id].children.push(p);
      } else if (!p.parent_id) {
        roots.push(p);
      }
    });

    res.json({ pages: roots, flat: pages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single page
router.get('/:id', (req, res) => {
  try {
    const page = queryOne(
      `SELECT p.*, GROUP_CONCAT(t.name) as tag_names, GROUP_CONCAT(t.id) as tag_ids, GROUP_CONCAT(t.color) as tag_colors
       FROM pages p
       LEFT JOIN page_tags pt ON p.id = pt.page_id
       LEFT JOIN tags t ON pt.tag_id = t.id
       WHERE p.id = ?
       GROUP BY p.id`,
      [req.params.id]
    );
    if (!page) return res.status(404).json({ error: 'Page not found' });
    page.tags = parseTags(page);
    
    // Get linked pages
    const links = query(
      `SELECT p.id, p.title, p.icon FROM pages p
       JOIN page_links pl ON p.id = pl.target_id
       WHERE pl.source_id = ?`,
      [req.params.id]
    );
    page.links = links;

    // Get backlinks
    const backlinks = query(
      `SELECT p.id, p.title, p.icon FROM pages p
       JOIN page_links pl ON p.id = pl.source_id
       WHERE pl.target_id = ?`,
      [req.params.id]
    );
    page.backlinks = backlinks;

    // Get files attached to page
    const files = query('SELECT * FROM files WHERE page_id = ? ORDER BY created_at DESC', [req.params.id]);
    page.files = files;

    // Get children
    page.children = query('SELECT id, title, icon, view_type FROM pages WHERE parent_id = ? AND is_archived = 0', [req.params.id]);

    res.json(page);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create page
router.post('/', (req, res) => {
  try {
    const { title = 'Untitled', content = '[]', parent_id, icon = '📄', cover, view_type = 'document' } = req.body;
    const id = uuidv4();
    run(
      `INSERT INTO pages (id, title, content, parent_id, icon, cover, view_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, title, typeof content === 'string' ? content : JSON.stringify(content), parent_id || null, icon, cover || null, view_type]
    );
    res.json(queryOne('SELECT * FROM pages WHERE id = ?', [id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update page
router.put('/:id', (req, res) => {
  try {
    const { title, content, icon, cover, is_favorite, view_type, parent_id } = req.body;
    const page = queryOne('SELECT * FROM pages WHERE id = ?', [req.params.id]);
    if (!page) return res.status(404).json({ error: 'Page not found' });

    const updatedTitle = title !== undefined ? title : page.title;
    const updatedContent = content !== undefined ? (typeof content === 'string' ? content : JSON.stringify(content)) : page.content;
    const updatedIcon = icon !== undefined ? icon : page.icon;
    const updatedCover = cover !== undefined ? cover : page.cover;
    const updatedFavorite = is_favorite !== undefined ? (is_favorite ? 1 : 0) : page.is_favorite;
    const updatedViewType = view_type !== undefined ? view_type : page.view_type;
    const updatedParent = parent_id !== undefined ? parent_id : page.parent_id;

    run(
      `UPDATE pages SET title=?, content=?, icon=?, cover=?, is_favorite=?, view_type=?, parent_id=?, updated_at=datetime('now') WHERE id=?`,
      [updatedTitle, updatedContent, updatedIcon, updatedCover, updatedFavorite, updatedViewType, updatedParent || null, req.params.id]
    );

    // Update links extracted from content
    if (content !== undefined) {
      try {
        const blocks = JSON.parse(updatedContent);
        const mentions = extractMentions(blocks);
        run('DELETE FROM page_links WHERE source_id = ?', [req.params.id]);
        mentions.forEach(targetId => {
          run('INSERT OR IGNORE INTO page_links (source_id, target_id) VALUES (?, ?)', [req.params.id, targetId]);
        });
      } catch (e) { /* ignore parse errors */ }
    }

    res.json(queryOne('SELECT * FROM pages WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (archive) page
router.delete('/:id', (req, res) => {
  try {
    const { permanent } = req.query;
    if (permanent === 'true') {
      run('DELETE FROM pages WHERE id = ?', [req.params.id]);
    } else {
      run(`UPDATE pages SET is_archived = 1, updated_at = datetime('now') WHERE id = ?`, [req.params.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST restore from archive
router.post('/:id/restore', (req, res) => {
  try {
    run(`UPDATE pages SET is_archived = 0, updated_at = datetime('now') WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST duplicate page
router.post('/:id/duplicate', (req, res) => {
  try {
    const page = queryOne('SELECT * FROM pages WHERE id = ?', [req.params.id]);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const newId = uuidv4();
    run(
      `INSERT INTO pages (id, title, content, parent_id, icon, cover, view_type) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newId, `${page.title} (copy)`, page.content, page.parent_id, page.icon, page.cover, page.view_type]
    );
    res.json(queryOne('SELECT * FROM pages WHERE id = ?', [newId]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET search
router.get('/search/query', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) return res.json([]);
    
    const results = query(
      `SELECT p.id, p.title, p.icon, p.updated_at, snippet(pages_fts, 2, '<mark>', '</mark>', '...', 20) as snippet
       FROM pages_fts fts
       JOIN pages p ON fts.id = p.id
       WHERE pages_fts MATCH ? AND p.is_archived = 0
       ORDER BY rank
       LIMIT 20`,
      [q + '*']
    );
    res.json(results);
  } catch (err) {
    // Fallback to LIKE search
    try {
      const results = query(
        `SELECT id, title, icon, updated_at FROM pages WHERE (title LIKE ? OR content LIKE ?) AND is_archived = 0 LIMIT 20`,
        [`%${req.query.q}%`, `%${req.query.q}%`]
      );
      res.json(results);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
});

// POST add tag to page
router.post('/:id/tags', (req, res) => {
  try {
    const { tag_id } = req.body;
    run('INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)', [req.params.id, tag_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove tag from page
router.delete('/:id/tags/:tagId', (req, res) => {
  try {
    run('DELETE FROM page_tags WHERE page_id = ? AND tag_id = ?', [req.params.id, req.params.tagId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function parseTags(page) {
  if (!page.tag_ids) return [];
  const ids = page.tag_ids.split(',');
  const names = (page.tag_names || '').split(',');
  const colors = (page.tag_colors || '').split(',');
  return ids.map((id, i) => ({ id, name: names[i], color: colors[i] })).filter(t => t.id);
}

function extractMentions(blocks) {
  const ids = [];
  const traverse = (block) => {
    if (block.type === 'mention' && block.attrs?.id) ids.push(block.attrs.id);
    if (Array.isArray(block.content)) block.content.forEach(traverse);
    if (Array.isArray(block.children)) block.children.forEach(traverse);
  };
  if (Array.isArray(blocks)) blocks.forEach(traverse);
  return [...new Set(ids)];
}

module.exports = router;
