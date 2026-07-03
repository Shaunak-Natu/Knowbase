import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { Plus, Star, Clock, FileText, Kanban } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function HomePage() {
  const { flatPages, createPage } = useApp()
  const navigate = useNavigate()

  const handleNew = async () => {
    const page = await createPage()
    if (page) navigate(`/page/${page.id}`)
  }

  const recent = flatPages
    .filter(p => !p.is_archived)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 12)

  const favorites = flatPages.filter(p => p.is_favorite && !p.is_archived)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '3rem 4rem', maxWidth: 860, margin: '0 auto', width: '100%' }}>
      {/* Hero */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🧠</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>KnowBase</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '1.5rem' }}>
          Your personal knowledge base. {flatPages.length} page{flatPages.length !== 1 ? 's' : ''} stored.
        </p>
        <button onClick={handleNew}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'opacity var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <Plus size={16} /> New page
        </button>
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <Section title="Favorites" icon={<Star size={14} />}>
          <PageGrid pages={favorites} navigate={navigate} />
        </Section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <Section title="Recently updated" icon={<Clock size={14} />}>
          <PageGrid pages={recent} navigate={navigate} />
        </Section>
      )}

      {/* Empty state */}
      {flatPages.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
          <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No pages yet</div>
          <div style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>Create your first page to get started</div>
          <button onClick={handleNew}
            style={{ padding: '0.6rem 1.25rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>
            Create a page
          </button>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {icon} {title}
      </div>
      {children}
    </div>
  )
}

function PageGrid({ pages, navigate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
      {pages.map(page => (
        <div key={page.id} onClick={() => navigate(`/page/${page.id}`)}
          style={{
            padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', cursor: 'pointer', transition: 'all var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
        >
          <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{page.icon || '📄'}</div>
          <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.25rem' }}>
            {page.title || 'Untitled'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {page.updated_at ? formatDistanceToNow(new Date(page.updated_at), { addSuffix: true }) : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
