import { ioApi } from '../lib/api'
import { X, FileJson, Package, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ExportModal({ onClose }) {
  const options = [
    {
      icon: <Package size={18} />,
      label: 'Notion-compatible ZIP',
      hint: 'Markdown files + attachments — importable into Notion',
      action: () => { ioApi.exportNotion(); toast.success('Export started') },
    },
    {
      icon: <FileJson size={18} />,
      label: 'KnowBase JSON',
      hint: 'Full backup including all pages, tags and metadata',
      action: () => { ioApi.exportJson(); toast.success('Export started') },
    },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Export</h3>
          <button className="toolbar-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {options.map((opt, i) => (
            <button key={i} onClick={() => { opt.action(); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', background: 'var(--bg-tertiary)',
                cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
            >
              <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{opt.icon}</span>
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{opt.label}</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{opt.hint}</div>
              </div>
            </button>
          ))}
        </div>

        <p style={{ marginTop: '1rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
          To export a single page as Markdown, open the page and click the ↓ icon in the top bar.
        </p>
      </div>
    </div>
  )
}
