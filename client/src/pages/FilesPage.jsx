import { useState, useEffect } from 'react'
import { filesApi } from '../lib/api'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, Trash2, Download, ExternalLink, File, Film, Music, FileText, Archive } from 'lucide-react'
import toast from 'react-hot-toast'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024, sizes = ['B','KB','MB','GB','TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function MimeIcon({ mime }) {
  const s = { color: 'var(--text-muted)' }
  if (!mime) return <File size={32} style={s} />
  if (mime.startsWith('video/')) return <Film size={32} style={s} />
  if (mime.startsWith('audio/')) return <Music size={32} style={s} />
  if (mime === 'application/pdf') return <span style={{ fontSize: '2rem' }}>📄</span>
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv')) return <span style={{ fontSize: '2rem' }}>📊</span>
  if (mime.includes('word') || mime.includes('document')) return <span style={{ fontSize: '2rem' }}>📝</span>
  if (mime.includes('zip') || mime.includes('tar')) return <Archive size={32} style={s} />
  return <FileText size={32} style={s} />
}

export default function FilesPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  const load = async () => {
    try {
      const res = await filesApi.getAll()
      setFiles(res.data)
    } catch { toast.error('Failed to load files') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDrop = async (dropped) => {
    setUploading(true)
    const fd = new FormData()
    dropped.forEach(f => fd.append('files', f))
    try {
      await filesApi.upload(fd)
      toast.success(`${dropped.length} file(s) uploaded`)
      load()
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const handleDelete = async (file) => {
    if (!confirm(`Delete "${file.original_name}"?`)) return
    try {
      await filesApi.delete(file.id)
      toast.success('File deleted')
      setFiles(f => f.filter(x => x.id !== file.id))
    } catch { toast.error('Delete failed') }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: handleDrop, noClick: false })

  const filterTypes = [
    { id: 'all',    label: 'All' },
    { id: 'image',  label: 'Images' },
    { id: 'video',  label: 'Videos' },
    { id: 'pdf',    label: 'PDFs' },
    { id: 'doc',    label: 'Docs' },
    { id: 'other',  label: 'Other' },
  ]

  const filtered = files.filter(f => {
    if (filter === 'all') return true
    if (filter === 'image') return f.mime_type?.startsWith('image/')
    if (filter === 'video') return f.mime_type?.startsWith('video/')
    if (filter === 'pdf')   return f.mime_type === 'application/pdf'
    if (filter === 'doc')   return f.mime_type?.includes('word') || f.mime_type?.includes('document') || f.mime_type?.includes('sheet') || f.mime_type?.includes('csv')
    return !f.mime_type?.startsWith('image/') && !f.mime_type?.startsWith('video/') && f.mime_type !== 'application/pdf'
  })

  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h2 style={{ fontWeight: 600, fontSize: '1.1rem' }}>All Files</h2>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
            {files.length} file{files.length !== 1 ? 's' : ''} · {formatBytes(totalSize)}
          </div>
        </div>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <button style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', padding: '0.5rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        {filterTypes.map(ft => (
          <button key={ft.id} onClick={() => setFilter(ft.id)}
            style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', cursor: 'pointer', border: 'none', background: filter === ft.id ? 'var(--accent-dim)' : 'transparent', color: filter === ft.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: filter === ft.id ? 600 : 400, transition: 'all var(--transition)' }}>
            {ft.label}
          </button>
        ))}
      </div>

      {/* Drop zone / grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {/* Upload drop area when empty */}
        {files.length === 0 && !loading && (
          <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-xl)', padding: '4rem 2rem', textAlign: 'center', cursor: 'pointer', background: isDragActive ? 'var(--accent-dim)' : 'transparent', transition: 'all var(--transition)' }}>
            <input {...getInputProps()} />
            <Upload size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.35rem' }}>Drop files here or click to upload</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.825rem' }}>No size limit · Images, videos, PDFs, docs, anything</div>
          </div>
        )}

        {loading && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Loading…</div>}

        {!loading && filtered.length === 0 && files.length > 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem', fontSize: '0.875rem' }}>No files in this category</div>
        )}

        <div className="file-grid">
          {filtered.map(file => {
            const isImage = file.mime_type?.startsWith('image/')
            const serveUrl = filesApi.serveUrl(file.id)
            return (
              <div key={file.id} className="file-card">
                <div className="file-card-preview" onClick={() => window.open(serveUrl, '_blank')} style={{ cursor: 'pointer' }}>
                  {isImage
                    ? <img src={serveUrl} alt={file.original_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <MimeIcon mime={file.mime_type} />}
                </div>
                <div className="file-card-info">
                  <div className="file-card-name" title={file.original_name}>{file.original_name}</div>
                  <div className="file-card-size">{formatBytes(file.size)}</div>
                  {file.page_title && (
                    <button onClick={() => navigate(`/page/${file.page_id}`)}
                      style={{ fontSize: '0.7rem', color: 'var(--accent)', cursor: 'pointer', display: 'block', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', border: 'none', background: 'none', textAlign: 'left', padding: 0 }}>
                      📄 {file.page_title}
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                    <a href={serveUrl} target="_blank" rel="noopener noreferrer" title="Open" style={{ display: 'flex', padding: '0.3rem', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }} onMouseEnter={e => e.currentTarget.style.color='var(--accent)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
                      <ExternalLink size={12} />
                    </a>
                    <a href={filesApi.downloadUrl(file.id)} title="Download" style={{ display: 'flex', padding: '0.3rem', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)' }} onMouseEnter={e => e.currentTarget.style.color='var(--accent)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
                      <Download size={12} />
                    </a>
                    <button onClick={() => handleDelete(file)} title="Delete" style={{ display: 'flex', padding: '0.3rem', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', border: 'none', background: 'none', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.color='var(--error)'} onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
