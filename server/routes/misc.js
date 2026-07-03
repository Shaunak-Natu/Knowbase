const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, queryOne, run } = require('../db/database');

// ─── TAGS ────────────────────────────────────────────────────────────────────

// GET all tags
router.get('/tags', (req, res) => {
  try {
    const tags = query(`
      SELECT t.*, COUNT(pt.page_id) as page_count
      FROM tags t
      LEFT JOIN page_tags pt ON t.id = pt.tag_id
      GROUP BY t.id
      ORDER BY t.name
    `);
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create tag
router.post('/tags', (req, res) => {
  try {
    const { name, color = '#6366f1' } = req.body;
    if (!name) return res.status(400).json({ error: 'Tag name required' });
    const existing = queryOne('SELECT * FROM tags WHERE name = ?', [name]);
    if (existing) return res.json(existing);
    const id = uuidv4();
    run('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)', [id, name, color]);
    res.json(queryOne('SELECT * FROM tags WHERE id = ?', [id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update tag
router.put('/tags/:id', (req, res) => {
  try {
    const { name, color } = req.body;
    const tag = queryOne('SELECT * FROM tags WHERE id = ?', [req.params.id]);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    run('UPDATE tags SET name = ?, color = ? WHERE id = ?', [name || tag.name, color || tag.color, req.params.id]);
    res.json(queryOne('SELECT * FROM tags WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE tag
router.delete('/tags/:id', (req, res) => {
  try {
    run('DELETE FROM tags WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET pages by tag
router.get('/tags/:id/pages', (req, res) => {
  try {
    const pages = query(`
      SELECT p.id, p.title, p.icon, p.updated_at, p.view_type
      FROM pages p
      JOIN page_tags pt ON p.id = pt.page_id
      WHERE pt.tag_id = ? AND p.is_archived = 0
      ORDER BY p.updated_at DESC
    `, [req.params.id]);
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── KANBAN ──────────────────────────────────────────────────────────────────

// GET board for page
router.get('/kanban/:pageId', (req, res) => {
  try {
    const columns = query(
      'SELECT * FROM kanban_columns WHERE page_id = ? ORDER BY position',
      [req.params.pageId]
    );
    const cards = query(
      'SELECT * FROM kanban_cards WHERE page_id = ? ORDER BY position',
      [req.params.pageId]
    );
    
    // Attach cards to columns
    const board = columns.map(col => ({
      ...col,
      cards: cards.filter(c => c.column_id === col.id)
    }));

    // Seed default columns if empty
    if (board.length === 0) {
      const defaults = ['To Do', 'In Progress', 'Done'];
      defaults.forEach((title, i) => {
        const id = uuidv4();
        run('INSERT INTO kanban_columns (id, page_id, title, position) VALUES (?, ?, ?, ?)', [id, req.params.pageId, title, i]);
        board.push({ id, page_id: req.params.pageId, title, position: i, cards: [] });
      });
    }

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create column
router.post('/kanban/:pageId/columns', (req, res) => {
  try {
    const { title = 'New Column', color = '#6366f1' } = req.body;
    const id = uuidv4();
    const pos = query('SELECT COUNT(*) as c FROM kanban_columns WHERE page_id = ?', [req.params.pageId])[0].c;
    run('INSERT INTO kanban_columns (id, page_id, title, position, color) VALUES (?, ?, ?, ?, ?)',
      [id, req.params.pageId, title, pos, color]);
    res.json(queryOne('SELECT * FROM kanban_columns WHERE id = ?', [id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update column
router.put('/kanban/columns/:id', (req, res) => {
  try {
    const { title, color, position } = req.body;
    const col = queryOne('SELECT * FROM kanban_columns WHERE id = ?', [req.params.id]);
    if (!col) return res.status(404).json({ error: 'Column not found' });
    run('UPDATE kanban_columns SET title=?, color=?, position=? WHERE id=?',
      [title ?? col.title, color ?? col.color, position ?? col.position, req.params.id]);
    res.json(queryOne('SELECT * FROM kanban_columns WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE column (moves cards to first column)
router.delete('/kanban/columns/:id', (req, res) => {
  try {
    const col = queryOne('SELECT * FROM kanban_columns WHERE id = ?', [req.params.id]);
    if (!col) return res.status(404).json({ error: 'Column not found' });
    const firstCol = queryOne('SELECT * FROM kanban_columns WHERE page_id = ? AND id != ? ORDER BY position', [col.page_id, req.params.id]);
    if (firstCol) {
      run('UPDATE kanban_cards SET column_id = ? WHERE column_id = ?', [firstCol.id, req.params.id]);
    } else {
      run('DELETE FROM kanban_cards WHERE column_id = ?', [req.params.id]);
    }
    run('DELETE FROM kanban_columns WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create card
router.post('/kanban/:pageId/cards', (req, res) => {
  try {
    const { column_id, title = 'New Card', description = '', color = '#6366f1', due_date } = req.body;
    const id = uuidv4();
    const pos = query('SELECT COUNT(*) as c FROM kanban_cards WHERE column_id = ?', [column_id])[0].c;
    run('INSERT INTO kanban_cards (id, page_id, column_id, title, description, position, color, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.params.pageId, column_id, title, description, pos, color, due_date || null]);
    res.json(queryOne('SELECT * FROM kanban_cards WHERE id = ?', [id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update card
router.put('/kanban/cards/:id', (req, res) => {
  try {
    const { title, description, column_id, position, color, due_date } = req.body;
    const card = queryOne('SELECT * FROM kanban_cards WHERE id = ?', [req.params.id]);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    run(`UPDATE kanban_cards SET title=?, description=?, column_id=?, position=?, color=?, due_date=?, updated_at=datetime('now') WHERE id=?`,
      [title ?? card.title, description ?? card.description, column_id ?? card.column_id,
       position ?? card.position, color ?? card.color, due_date ?? card.due_date, req.params.id]);
    res.json(queryOne('SELECT * FROM kanban_cards WHERE id = ?', [req.params.id]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE card
router.delete('/kanban/cards/:id', (req, res) => {
  try {
    run('DELETE FROM kanban_cards WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
