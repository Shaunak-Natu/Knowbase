const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const { query, queryOne, run } = require('../db/database');

const UPLOADS_DIR = process.env.UPLOADS_DIR ||
  path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer storage — keep original extension, no size limit
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dateDir = new Date().toISOString().slice(0, 7); // YYYY-MM
    const dir = path.join(UPLOADS_DIR, dateDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || `.${mime.extension(file.mimetype) || 'bin'}`;
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: Infinity } // No size limit
});

// POST upload file(s)
router.post('/upload', upload.array('files', 50), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    const { page_id } = req.body;
    const savedFiles = [];

    req.files.forEach(file => {
      const id = uuidv4();
      const relativePath = file.path.replace(path.join(__dirname, '../../'), '');
      run(
        `INSERT INTO files (id, page_id, filename, original_name, mime_type, size, path) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, page_id || null, file.filename, file.originalname, file.mimetype, file.size, relativePath]
      );
      savedFiles.push({
        id,
        filename: file.filename,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        path: relativePath,
        url: `/api/files/${id}/serve`
      });
    });

    res.json({ files: savedFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET list files for a page
router.get('/page/:pageId', (req, res) => {
  try {
    const files = query('SELECT * FROM files WHERE page_id = ? ORDER BY created_at DESC', [req.params.pageId]);
    const withUrls = files.map(f => ({ ...f, url: `/api/files/${f.id}/serve` }));
    res.json(withUrls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET serve file
router.get('/:id/serve', (req, res) => {
  try {
    const file = queryOne('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    const filePath = path.join(__dirname, '../../', file.path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing from disk' });

    const { download } = req.query;
    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
    }
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET file metadata
router.get('/:id', (req, res) => {
  try {
    const file = queryOne('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json({ ...file, url: `/api/files/${file.id}/serve` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE file
router.delete('/:id', (req, res) => {
  try {
    const file = queryOne('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (!file) return res.status(404).json({ error: 'File not found' });
    
    // Remove from disk
    const filePath = path.join(__dirname, '../../', file.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    run('DELETE FROM files WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all files
router.get('/', (req, res) => {
  try {
    const files = query('SELECT f.*, p.title as page_title FROM files f LEFT JOIN pages p ON f.page_id = p.id ORDER BY f.created_at DESC');
    const withUrls = files.map(f => ({ ...f, url: `/api/files/${f.id}/serve` }));
    res.json(withUrls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
