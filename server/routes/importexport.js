const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const unzipper = require('unzipper');
const multer = require('multer');
const { marked } = require('marked');
const { query, queryOne, run } = require('../db/database');

const upload = multer({ dest: '/tmp/knowbase-imports/' });

// ─── EXPORT ──────────────────────────────────────────────────────────────────

// GET export all as JSON
router.get('/export/json', (req, res) => {
  try {
    const pages = query('SELECT * FROM pages WHERE is_archived = 0');
    const tags = query('SELECT * FROM tags');
    const pageTags = query('SELECT * FROM page_tags');
    const files = query('SELECT * FROM files');

    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      pages,
      tags,
      page_tags: pageTags,
      files: files.map(f => ({ ...f, url: `/api/files/${f.id}/serve` }))
    };

    res.setHeader('Content-Disposition', `attachment; filename="knowbase-export-${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET export as Markdown zip (Notion-compatible)
router.get('/export/notion', (req, res) => {
  try {
    const pages = query('SELECT * FROM pages WHERE is_archived = 0');
    
    res.setHeader('Content-Disposition', `attachment; filename="knowbase-notion-export-${Date.now()}.zip"`);
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    pages.forEach(page => {
      const mdContent = pageToMarkdown(page, pages);
      const safeName = sanitizeFilename(page.title || 'Untitled');
      archive.append(mdContent, { name: `${safeName}-${page.id.slice(0, 8)}.md` });
    });

    // Include files
    const files = query('SELECT * FROM files');
    files.forEach(file => {
      const filePath = path.join(__dirname, '../../', file.path);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: `files/${file.original_name}` });
      }
    });

    archive.finalize();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET export single page as Markdown
router.get('/export/page/:id', (req, res) => {
  try {
    const page = queryOne('SELECT * FROM pages WHERE id = ?', [req.params.id]);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    const pages = query('SELECT * FROM pages');
    const md = pageToMarkdown(page, pages);
    const safeName = sanitizeFilename(page.title || 'Untitled');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.md"`);
    res.setHeader('Content-Type', 'text/markdown');
    res.send(md);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── IMPORT ──────────────────────────────────────────────────────────────────

// POST import KnowBase JSON
router.post('/import/json', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const raw = fs.readFileSync(req.file.path, 'utf-8');
    const data = JSON.parse(raw);
    
    let imported = 0;
    const idMap = {}; // map old IDs to new IDs if needed

    if (data.tags) {
      data.tags.forEach(tag => {
        const existing = queryOne('SELECT id FROM tags WHERE id = ?', [tag.id]);
        if (!existing) {
          run('INSERT OR IGNORE INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
            [tag.id, tag.name, tag.color, tag.created_at]);
        }
      });
    }

    if (data.pages) {
      data.pages.forEach(page => {
        const existing = queryOne('SELECT id FROM pages WHERE id = ?', [page.id]);
        if (!existing) {
          run(`INSERT INTO pages (id, title, content, parent_id, icon, cover, is_archived, is_favorite, view_type, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [page.id, page.title, page.content, page.parent_id, page.icon, page.cover,
             page.is_archived, page.is_favorite, page.view_type || 'document', page.created_at, page.updated_at]);
          imported++;
        }
      });
    }

    if (data.page_tags) {
      data.page_tags.forEach(pt => {
        run('INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)', [pt.page_id, pt.tag_id]);
      });
    }

    fs.unlinkSync(req.file.path);
    res.json({ success: true, imported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST import Notion export (ZIP with MD files)
router.post('/import/notion', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    
    const tmpDir = `/tmp/notion-import-${Date.now()}`;
    fs.mkdirSync(tmpDir, { recursive: true });

    // Extract zip
    await fs.createReadStream(req.file.path)
      .pipe(unzipper.Extract({ path: tmpDir }))
      .promise();

    let imported = 0;
    const processDir = (dir, parentId = null) => {
      const entries = fs.readdirSync(dir);
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          // Create a page for the directory
          const dirId = uuidv4();
          const dirTitle = entry.replace(/_[a-f0-9]+$/, '').replace(/-/g, ' ').trim();
          run('INSERT INTO pages (id, title, content, parent_id, icon) VALUES (?, ?, ?, ?, ?)',
            [dirId, dirTitle || 'Imported Folder', '[]', parentId, '📁']);
          imported++;
          processDir(fullPath, dirId);
        } else if (entry.endsWith('.md') || entry.endsWith('.markdown')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const title = entry.replace(/\.md$|\.markdown$/, '').replace(/_[a-f0-9]+$/, '').replace(/-/g, ' ').trim();
          const id = uuidv4();
          // Convert MD content to our block format
          const blocks = markdownToBlocks(content);
          run('INSERT INTO pages (id, title, content, parent_id, icon) VALUES (?, ?, ?, ?, ?)',
            [id, title || 'Imported Page', JSON.stringify(blocks), parentId, '📄']);
          imported++;
        } else if (entry.endsWith('.html')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const title = entry.replace(/\.html$/, '').replace(/-/g, ' ').trim();
          const id = uuidv4();
          const blocks = htmlToBlocks(content);
          run('INSERT INTO pages (id, title, content, parent_id, icon) VALUES (?, ?, ?, ?, ?)',
            [id, title || 'Imported Page', JSON.stringify(blocks), parentId, '📄']);
          imported++;
        } else if (entry.endsWith('.csv')) {
          // Import CSV as table page
          const content = fs.readFileSync(fullPath, 'utf-8');
          const id = uuidv4();
          const title = entry.replace(/\.csv$/, '').trim();
          const tableBlock = csvToTableBlock(content);
          run('INSERT INTO pages (id, title, content, parent_id, icon) VALUES (?, ?, ?, ?, ?)',
            [id, title, JSON.stringify([tableBlock]), parentId, '📊']);
          imported++;
        }
      });
    };

    processDir(tmpDir);
    
    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.unlinkSync(req.file.path);

    res.json({ success: true, imported });
  } catch (err) {
    console.error('Notion import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST import Markdown file(s)
router.post('/import/markdown', upload.array('files', 50), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files provided' });
    let imported = 0;
    req.files.forEach(file => {
      const content = fs.readFileSync(file.path, 'utf-8');
      const title = file.originalname.replace(/\.md$/, '');
      const id = uuidv4();
      const blocks = markdownToBlocks(content);
      run('INSERT INTO pages (id, title, content, icon) VALUES (?, ?, ?, ?)',
        [id, title, JSON.stringify(blocks), '📄']);
      fs.unlinkSync(file.path);
      imported++;
    });
    res.json({ success: true, imported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function pageToMarkdown(page, allPages) {
  let md = `# ${page.title}\n\n`;
  md += `> Created: ${page.created_at}\n> Updated: ${page.updated_at}\n\n`;
  
  try {
    const blocks = JSON.parse(page.content || '[]');
    md += blocksToMarkdown(blocks);
  } catch (e) {
    md += page.content || '';
  }

  // Add children references
  const children = allPages.filter(p => p.parent_id === page.id);
  if (children.length > 0) {
    md += '\n\n## Sub-pages\n';
    children.forEach(c => { md += `- [[${c.title}]]\n`; });
  }

  return md;
}

function blocksToMarkdown(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks.map(block => {
    switch (block.type) {
      case 'heading': return `${'#'.repeat(block.attrs?.level || 1)} ${getBlockText(block)}\n`;
      case 'paragraph': return `${getBlockText(block)}\n`;
      case 'bulletList': return (block.content || []).map(item => `- ${getBlockText(item)}`).join('\n') + '\n';
      case 'orderedList': return (block.content || []).map((item, i) => `${i + 1}. ${getBlockText(item)}`).join('\n') + '\n';
      case 'codeBlock': return `\`\`\`${block.attrs?.language || ''}\n${getBlockText(block)}\n\`\`\`\n`;
      case 'blockquote': return `> ${getBlockText(block)}\n`;
      case 'horizontalRule': return `---\n`;
      case 'image': return `![${block.attrs?.alt || ''}](${block.attrs?.src || ''})\n`;
      default: return `${getBlockText(block)}\n`;
    }
  }).join('\n');
}

function getBlockText(block) {
  if (block.text) return block.text;
  if (Array.isArray(block.content)) return block.content.map(getBlockText).join('');
  return '';
}

function markdownToBlocks(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      blocks.push({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: line.slice(2) }] });
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: line.slice(3) }] });
    } else if (line.startsWith('### ')) {
      blocks.push({ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: line.slice(4) }] });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'text', text: line.slice(2) }] }] });
    } else if (/^\d+\. /.test(line)) {
      blocks.push({ type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'text', text: line.replace(/^\d+\. /, '') }] }] });
    } else if (line.startsWith('> ')) {
      blocks.push({ type: 'blockquote', content: [{ type: 'text', text: line.slice(2) }] });
    } else if (line.startsWith('```')) {
      const lang = line.slice(3);
      let code = '';
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      blocks.push({ type: 'codeBlock', attrs: { language: lang }, content: [{ type: 'text', text: code.trim() }] });
    } else if (line.trim() === '---' || line.trim() === '***') {
      blocks.push({ type: 'horizontalRule' });
    } else if (line.trim()) {
      blocks.push({ type: 'paragraph', content: [{ type: 'text', text: line }] });
    }
    i++;
  }

  return blocks;
}

function htmlToBlocks(html) {
  // Basic HTML to blocks conversion
  const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return [{ type: 'paragraph', content: [{ type: 'text', text: textContent }] }];
}

function csvToTableBlock(csv) {
  const rows = csv.trim().split('\n').map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
  return {
    type: 'table',
    content: rows.map((row, i) => ({
      type: 'tableRow',
      content: row.map(cell => ({
        type: i === 0 ? 'tableHeader' : 'tableCell',
        content: [{ type: 'text', text: cell }]
      }))
    }))
  };
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9\-_\s]/gi, '').replace(/\s+/g, '-').toLowerCase().slice(0, 100) || 'page';
}

module.exports = router;
