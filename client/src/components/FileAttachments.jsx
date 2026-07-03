import { useState } from 'react'
import { filesApi } from '../lib/api'
import { Download, Trash2, FileText, Film, Music, Archive, File } from 'lucide-react'
import toast from 'react-hot-toast'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function FileIcon({ mime }) {
  if (!mime) return <File size={28} />
  if (mime.startsWith('image/')) return <span style={{ fontSize: '1.75rem' }}>🖼️</span>
  if (mime.startsWith('video/')) return <Film size={28} />
  if (mime.startsWith('audio/')) return <Music size={28} />
  if (mime === 'application/pdf') return <span style={{ fontSize: '1.75rem' }}>📄</span>
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return <span style={{ fontSize: '1.75rem' }}>📊</span>
  if (mime.includes('word') || mime.includes('document')) return <span style={{ fontSize: '1.75rem' }}>📝</span>
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return <Archive size={28} />
  return <FileText size={28} />
}

export default function FileAttachments({ files, pageId, onUpdate }) {
  const [deleting, setDeleting] = useState(null)

  const handleDelete = async (file) => {
    if (!confirm(`Delete "${file.original_name}"?`)) return
    setDeleting(file.id)
    try {
      await filesApi.delete(file.id)
      toast.success('File deleted')
      onUpdate()
    } catch { toast.error('Failed to delete file') }
    finally { setDeleting(null) }
  }

  if (!files || files.length === 0) return null

  return (
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
        Attachments ({files.length})
      </div>
      <div className="file-grid">
        {files.map(file => {
          const isImage = file.mime_type?.startsWith('image/')
          const isVideo = file.mime_type?.startsWith('video/')
          const serveUrl = filesApi.serveUrl(file.id)

          return (
            <div key={file.id} className="file-card">
              {/* Preview */}
              <div className="file-card-preview">
                {isImage ? (
                  <img src={serveUrl} alt={file.original_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : isVideo ? (
                  <video src={serveUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>
                    <FileIcon mime={file.mime_type} />
                  </div>
                )}
              </div>

              {/* Info + actions */}
              <div className="file-card-info">
                <div className="file-card-name" title={file.original_name}>{file.original_name}</div>
                <div className="file-card-size">{formatBytes(file.size)}</div>
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', justifyContent: 'center' }}>
                  <a
                    href={filesApi.serveUrl(file.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open"
                    style={{ display: 'flex', padding: '0.25rem', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', transition: 'color var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <File size={13} />
                  </a>
                  <a
                    href={filesApi.downloadUrl(file.id)}
                    title="Download"
                    style={{ display: 'flex', padding: '0.25rem', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', transition: 'color var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Download size={13} />
                  </a>
                  <button
                    onClick={() => handleDelete(file)}
                    disabled={deleting === file.id}
                    title="Delete"
                    style={{ display: 'flex', padding: '0.25rem', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)', transition: 'color var(--transition)', opacity: deleting === file.id ? 0.4 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
