import { useState, useEffect } from 'react'
import { pagesApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function TrashPage() {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const { loadPages } = useApp()
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const res = await pagesApi.getAll(true)
      setPages(res.data.flat)
    } catch { toast.error('Failed to load trash') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const restore = async (id) => {
    try {
      await pagesApi.restore(id)
      toast.success('Page restored')
      load()
      loadPages()
    } catch { toast.error('Failed to restore') }
  }

  const deletePermanently = async (id, title) => {
    if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return
    try {
      await pagesApi.delete(id, true)
      toast.success('Page permanently deleted')
      load()
    } catch { toast.error('Failed to delete') }
  }

  const deleteAll = async () => {
    if (!confirm(`Permanently delete all ${pages.length} pages in trash? This cannot be undone.`)) return
    try {
      await Promise.all(pages.map(p => pagesApi.delete(p.id, true)))
      toast.success('Trash emptied')
      load()
      loadPages()
    } catch { toast.error('Failed to empty trash') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Trash</h2>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            {pages.length} page{pages.length !== 1 ? 's' : ''}
          </div>
        </div>
        {pages.length > 0 && (
          <button onClick={deleteAll}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', background: 'var(--danger-dim)', color: 'var(--error)', border: '1px solid var(--error)33', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer' }}>
            <Trash2 size={13} /> Empty trash
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {loading && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Loading…</div>}

        {!loading && pages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <Trash2 size={36} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Trash is empty</div>
          </div>
        )}

        {!loading && pages.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.6rem 1rem', background: 'var(--danger-dim)', border: '1px solid var(--error)33', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', color: 'var(--error)' }}>
              <AlertTriangle size={14} />
              Pages in trash are not automatically deleted. Use "Empty trash" to remove them permanently.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {pages.map(page => (
                <div key={page.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', transition: 'border-color var(--transition)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{page.icon || '📄'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {page.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                      Deleted {page.updated_at ? formatDistanceToNow(new Date(page.updated_at), { addSuffix: true }) : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                    <button onClick={() => restore(page.id)} title="Restore"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.7rem', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)33', borderRadius: 'var(--radius-sm)', fontSize: '0.775rem', cursor: 'pointer', fontWeight: 500 }}>
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button onClick={() => deletePermanently(page.id, page.title)} title="Delete permanently"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.7rem', background: 'var(--danger-dim)', color: 'var(--error)', border: '1px solid var(--error)33', borderRadius: 'var(--radius-sm)', fontSize: '0.775rem', cursor: 'pointer', fontWeight: 500 }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
