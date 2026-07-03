import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { pagesApi, filesApi, tagsApi, ioApi } from '../lib/api'
import { useApp } from '../App'
import RichEditor from '../components/RichEditor'
import FileAttachments from '../components/FileAttachments'
import TagManager from '../components/TagManager'
import EmojiPicker from 'emoji-picker-react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  Star, StarOff, Kanban, Download, MoreHorizontal,
  Upload, ChevronRight, Trash2, Copy, Tag, Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function PageEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { loadPages, flatPages, deletePage } = useApp()

  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [title, setTitle] = useState('')
  const titleRef = useRef(null)
  const saveTimeout = useRef(null)

  const loadPage = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await pagesApi.get(id)
      setPage(res.data)
      setTitle(res.data.title || '')
    } catch (err) {
      toast.error('Page not found')
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadPage() }, [loadPage])

  const save = useCallback(async (updates) => {
    if (!id) return
    setSaving(true)
    try {
      await pagesApi.update(id, updates)
      if (updates.title !== undefined || updates.icon !== undefined) loadPages()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }, [id, loadPages])

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => save({ title: val }), 500)
  }

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      document.querySelector('.ProseMirror')?.focus()
    }
  }

  const handleContentChange = useCallback((json) => {
    save({ content: JSON.stringify(json) })
  }, [save])

  const handleEmojiSelect = (emojiData) => {
    const icon = emojiData.emoji
    setPage(p => ({ ...p, icon }))
    save({ icon })
    setShowEmoji(false)
  }

  const handleFileInsert = async (files) => {
    if (!files.length) return
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    fd.append('page_id', id)
    try {
      const res = await filesApi.upload(fd)
      // Insert images directly into editor
      res.data.files.forEach(f => {
        if (f.mime_type?.startsWith('image/')) {
          // Images get embedded
          const event = new CustomEvent('insertImage', { detail: { url: f.url, alt: f.original_name } })
          window.dispatchEvent(event)
        }
      })
      toast.success(`${res.data.files.length} file(s) uploaded`)
      loadPage()
    } catch { toast.error('Upload failed') }
  }

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop: handleFileInsert,
    noClick: true,
    noKeyboard: true,
  })

  const toggleFavorite = async () => {
    const next = !page.is_favorite
    setPage(p => ({ ...p, is_favorite: next }))
    await save({ is_favorite: next })
  }

  // Build breadcrumb
  const breadcrumb = []
  if (page) {
    let current = flatPages.find(p => p.id === page.parent_id)
    const trail = []
    while (current) {
      trail.unshift(current)
      current = flatPages.find(p => p.id === current.parent_id)
    }
    breadcrumb.push(...trail)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )

  if (!page) return null

  let parsedContent = page.content
  try { parsedContent = JSON.parse(page.content) } catch {}

  return (
    <div {...getRootProps()} style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(124,106,255,0.1)', border: '2px dashed var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', borderRadius: 'var(--radius-lg)'
        }}>
          <div style={{ color: 'var(--accent)', fontSize: '1.25rem', fontWeight: 600 }}>
            📎 Drop files to attach
          </div>
        </div>
      )}

      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0 1rem', height: 'var(--topbar-height)',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        {/* Breadcrumb */}
        <div className="breadcrumb flex-1 page-topbar-breadcrumb">
          {breadcrumb.map(b => (
            <span key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button onClick={() => navigate(`/page/${b.id}`)} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>
                {b.icon} {b.title}
              </button>
              <ChevronRight size={12} className="breadcrumb-sep" />
            </span>
          ))}
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
            {page.icon} {title || 'Untitled'}
          </span>
        </div>

        {/* Actions */}
        <div className="page-topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
          {saving && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Saving…</span>}
          {page.updated_at && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {formatDistanceToNow(new Date(page.updated_at))} ago
            </span>
          )}
          <button className="toolbar-btn" onClick={toggleFavorite} title={page.is_favorite ? 'Remove from favorites' : 'Add to favorites'}>
            {page.is_favorite ? <Star size={15} fill="currentColor" color="var(--warning)" /> : <Star size={15} />}
          </button>
          <button className="toolbar-btn" onClick={() => navigate(`/kanban/${id}`)} title="Kanban view">
            <Kanban size={15} />
          </button>
          <button className="toolbar-btn" onClick={openFileDialog} title="Upload files">
            <Upload size={15} />
          </button>
          <button className="toolbar-btn" onClick={() => ioApi.exportPage(id)} title="Export as Markdown">
            <Download size={15} />
          </button>
          <div style={{ position: 'relative' }}>
            <button className="toolbar-btn" onClick={() => setShowMenu(v => !v)} title="More options">
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowMenu(false)} />
                <div className="context-menu" style={{ position: 'absolute', right: 0, top: '110%', zIndex: 1000 }}>
                  <div className="context-menu-item" onClick={() => { navigate(`/kanban/${id}`); setShowMenu(false) }}>
                    <Kanban size={13} /> Kanban view
                  </div>
                  <div className="context-menu-item" onClick={() => { ioApi.exportPage(id); setShowMenu(false) }}>
                    <Download size={13} /> Export as Markdown
                  </div>
                  <div className="context-menu-divider" />
                  <div className="context-menu-item danger" onClick={() => { deletePage(id); navigate('/'); setShowMenu(false) }}>
                    <Trash2 size={13} /> Move to trash
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Cover image */}
        {page.cover && (
          <div style={{ height: 200, background: page.cover.startsWith('#') ? page.cover : `url(${page.cover}) center/cover`, flexShrink: 0 }} />
        )}

        {/* Page header */}
        <div className="page-header" style={{ padding: '2rem 4rem 1rem', maxWidth: 900, margin: '0 auto', width: '100%' }}>
          {/* Icon */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.5rem' }}>
            <button
              className="page-icon-btn"
              onClick={() => setShowEmoji(v => !v)}
              style={{ fontSize: '3rem', lineHeight: 1, cursor: 'pointer', padding: '0.25rem', borderRadius: 'var(--radius-md)', transition: 'background var(--transition)' }}
              onMouseEnter={e => e.target.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.target.style.background = 'transparent'}
            >
              {page.icon || '📄'}
            </button>
            {showEmoji && (
              <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 500 }}>
                <div style={{ position: 'fixed', inset: 0 }} onClick={() => setShowEmoji(false)} />
                <div style={{ position: 'relative', zIndex: 501 }}>
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    theme="dark"
                    width={320}
                    height={400}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <input
            ref={titleRef}
            className="page-title-input"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            style={{
              display: 'block', width: '100%', background: 'transparent', border: 'none',
              outline: 'none', fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)', padding: 0, lineHeight: 1.2,
              caretColor: 'var(--accent)'
            }}
          />

          {/* Tags */}
          <div style={{ marginTop: '0.75rem' }}>
            <TagManager page={page} onUpdate={loadPage} />
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <RichEditor
            content={parsedContent}
            onChange={handleContentChange}
            onFileInsert={handleFileInsert}
            pageId={id}
          />
        </div>

        {/* File attachments */}
        {page.files && page.files.length > 0 && (
          <div style={{ padding: '1rem 4rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', maxWidth: 900, margin: '0 auto', width: '100%' }}>
            <FileAttachments files={page.files} pageId={id} onUpdate={loadPage} />
          </div>
        )}

        {/* Backlinks */}
        {page.backlinks && page.backlinks.length > 0 && (
          <div style={{ padding: '1rem 4rem 2rem', maxWidth: 900, margin: '0 auto', width: '100%' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Linked from
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {page.backlinks.map(b => (
                <button key={b.id} onClick={() => navigate(`/page/${b.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.825rem', cursor: 'pointer', transition: 'all var(--transition)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {b.icon} {b.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
