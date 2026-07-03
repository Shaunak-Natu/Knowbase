import { useState, useRef } from 'react'
import { ioApi } from '../lib/api'
import { Upload, X, FileJson, FileText, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDropzone } from 'react-dropzone'

export default function ImportModal({ onClose }) {
  const [mode, setMode] = useState(null) // 'json' | 'notion' | 'markdown'
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const doImport = async (files) => {
    if (!files.length) return
    setLoading(true)
    try {
      let res
      if (mode === 'json') res = await ioApi.importJson(files[0])
      else if (mode === 'notion') res = await ioApi.importNotion(files[0])
      else if (mode === 'markdown') res = await ioApi.importMarkdown(files)
      setResult(res.data)
      toast.success(`Imported ${res.data.imported} page(s)`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: doImport,
    accept: mode === 'json' ? { 'application/json': ['.json'] }
          : mode === 'notion' ? { 'application/zip': ['.zip'] }
          : { 'text/markdown': ['.md', '.markdown'] },
    multiple: mode === 'markdown',
    disabled: !mode || loading,
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1.1rem' }}>Import</h3>
          <button className="toolbar-btn" onClick={onClose}><X size={15} /></button>
        </div>

        {!result ? (
          <>
            {/* Format selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {[
                { id: 'notion',   icon: <Package size={16} />,  label: 'Notion export',  hint: '.zip file from Notion → Export' },
                { id: 'json',     icon: <FileJson size={16} />, label: 'KnowBase JSON',  hint: 'Exported from KnowBase' },
                { id: 'markdown', icon: <FileText size={16} />, label: 'Markdown files', hint: 'One or multiple .md files' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setMode(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${mode === opt.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: mode === opt.id ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition)'
                  }}>
                  <span style={{ color: mode === opt.id ? 'var(--accent)' : 'var(--text-muted)' }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{opt.hint}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Drop zone */}
            {mode && (
              <div {...getRootProps()} style={{
                border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: '2rem',
                textAlign: 'center', cursor: 'pointer',
                background: isDragActive ? 'var(--accent-dim)' : 'var(--bg-tertiary)',
                transition: 'all var(--transition)'
              }}>
                <input {...getInputProps()} />
                <Upload size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {loading ? 'Importing…' : isDragActive ? 'Drop it!' : 'Drop file here or click to browse'}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Import complete</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{result.imported} page(s) imported</div>
            <button onClick={onClose}
              style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
