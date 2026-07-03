import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { pagesApi } from '../lib/api'
import { Search, FileText, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useApp } from '../App'

export default function SearchPalette({ onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const { flatPages } = useApp()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus() }, [])

  // Show recent pages when query is empty
  const recent = flatPages
    .slice()
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 7)

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSelected(0); return }
    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await pagesApi.search(query)
        setResults(res.data)
        setSelected(0)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 200)
  }, [query])

  const items = query.trim() ? results : recent

  const goTo = (page) => {
    navigate(`/page/${page.id}`)
    onClose()
  }

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && items[selected]) goTo(items[selected])
    if (e.key === 'Escape') onClose()
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1099 }} onClick={onClose} />
      <div className="search-palette" onKeyDown={handleKey}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '1rem', color: 'var(--text-primary)', padding: 0 }}
          />
          {loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>…</span>}
          <kbd style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {items.length === 0 && query.trim() && !loading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No pages found for "{query}"
            </div>
          )}

          {!query.trim() && (
            <div style={{ padding: '0.4rem 1rem 0.2rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Recent
            </div>
          )}

          {items.map((page, i) => (
            <div
              key={page.id}
              onClick={() => goTo(page)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 1rem', cursor: 'pointer',
                background: i === selected ? 'var(--bg-hover)' : 'transparent',
                transition: 'background var(--transition)',
              }}
              onMouseEnter={() => setSelected(i)}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{page.icon || '📄'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {page.title || 'Untitled'}
                </div>
                {page.snippet && (
                  <div
                    style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    dangerouslySetInnerHTML={{ __html: page.snippet }}
                  />
                )}
              </div>
              {page.updated_at && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {formatDistanceToNow(new Date(page.updated_at), { addSuffix: false })}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.4rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>ESC close</span>
        </div>
      </div>
    </>
  )
}
