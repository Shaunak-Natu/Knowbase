import { useState } from 'react'
import { useApp } from '../App'
import { tagsApi, pagesApi } from '../lib/api'
import { Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

const TAG_COLORS = ['#00d4aa','#388bfd','#3fb950','#d29922','#f85149','#8b5cf6','#ec4899','#8b949e']

export default function TagManager({ page, onUpdate }) {
  const { tags, loadTags } = useApp()
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])

  const pageTags = page.tags || []
  const pageTagIds = pageTags.map(t => t.id)
  const availableTags = tags.filter(t => !pageTagIds.includes(t.id))

  const addExisting = async (tag) => {
    try {
      await pagesApi.addTag(page.id, tag.id)
      onUpdate()
    } catch { toast.error('Failed to add tag') }
    setOpen(false)
  }

  const createAndAdd = async () => {
    if (!newName.trim()) return
    try {
      const res = await tagsApi.create(newName.trim(), newColor)
      await pagesApi.addTag(page.id, res.data.id)
      await loadTags()
      onUpdate()
      setNewName('')
    } catch { toast.error('Failed to create tag') }
    setOpen(false)
  }

  const removeTag = async (tagId) => {
    try {
      await pagesApi.removeTag(page.id, tagId)
      onUpdate()
    } catch { toast.error('Failed to remove tag') }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
      {pageTags.map(tag => (
        <span key={tag.id} className="tag-pill" style={{ background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44` }}>
          {tag.name}
          <button onClick={() => removeTag(tag.id)} style={{ display: 'flex', color: 'inherit', opacity: 0.7, marginLeft: 2 }}>
            <X size={10} />
          </button>
        </span>
      ))}

      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '0.15rem 0.5rem', borderRadius: '100px', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px dashed var(--border)', cursor: 'pointer', transition: 'all var(--transition)' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <Plus size={10} /> Add tag
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 499 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 500, marginTop: '0.35rem',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '0.75rem', minWidth: 220,
            boxShadow: 'var(--shadow-lg)'
          }}>
            {/* Create new */}
            <div style={{ marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>New tag</div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createAndAdd()}
                  placeholder="Tag name…"
                  style={{ flex: 1, fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                  autoFocus
                />
                <button onClick={createAndAdd}
                  style={{ padding: '0.3rem 0.6rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  +
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                {TAG_COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)}
                    style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: newColor === c ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>

            {/* Existing tags */}
            {availableTags.length > 0 && (
              <>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Existing</div>
                {availableTags.map(tag => (
                  <div key={tag.id} onClick={() => addExisting(tag)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.4rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-primary)' }}>{tag.name}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{tag.page_count || 0}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
