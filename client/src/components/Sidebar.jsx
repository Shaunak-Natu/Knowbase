import { useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../App'
import { pagesApi } from '../lib/api'
import {
  Plus, Search, Trash2, FileText, Star, Files, ChevronRight,
  ChevronDown, MoreHorizontal, Download, Upload,
  Kanban, Home, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import ImportModal from './ImportModal'
import ExportModal from './ExportModal'

export default function Sidebar() {
  const { pages, flatPages, createPage, deletePage, loadPages, setSearchOpen, sidebarOpen, setSidebarOpen } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState({})
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [dragging, setDragging] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)

  const isActive = (id) => location.pathname === `/page/${id}` || location.pathname === `/kanban/${id}`
  const toggleCollapse = (id) => setCollapsed(p => ({ ...p, [id]: !p[id] }))

  const handleNew = async (parentId = null) => {
    const page = await createPage({ parent_id: parentId })
    if (page) navigate(`/page/${page.id}`)
    setSidebarOpen(false)
  }

  const handleContextMenu = (e, page) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, page })
  }

  const handleRename = async (page) => {
    const name = prompt('New name:', page.title)
    if (name && name !== page.title) {
      await pagesApi.update(page.id, { title: name })
      await loadPages()
    }
    setContextMenu(null)
  }

  const handleDuplicate = async (id) => {
    try {
      const res = await pagesApi.duplicate(id)
      await loadPages()
      navigate(`/page/${res.data.id}`)
      toast.success('Page duplicated')
    } catch { toast.error('Failed to duplicate') }
    setContextMenu(null)
  }

  const handleToggleFav = async (page) => {
    await pagesApi.update(page.id, { is_favorite: !page.is_favorite })
    await loadPages()
    setContextMenu(null)
  }

  // Sidebar resize (desktop only)
  const startResize = (e) => {
    setDragging(true)
    const startX = e.clientX
    const startW = sidebarWidth
    const onMove = (ev) => setSidebarWidth(Math.max(180, Math.min(480, startW + ev.clientX - startX)))
    const onUp = () => { setDragging(false); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const favPages = flatPages.filter(p => p.is_favorite)

  // On mobile the sidebar is fixed; on desktop it's in-flow
  const isMobile = window.innerWidth <= 768

  return (
    <>
      <aside
        className={isMobile ? `sidebar-drawer ${sidebarOpen ? 'open' : ''}` : ''}
        style={{
          width: isMobile ? 280 : sidebarWidth,
          minWidth: isMobile ? 280 : sidebarWidth,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          userSelect: dragging ? 'none' : 'auto',
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div style={{ padding: '0.75rem 0.75rem 0.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              <span style={{ fontSize: '1.2rem' }}>🧠</span>
              <span>KnowBase</span>
            </div>
            <div style={{ display: 'flex', gap: '0.15rem' }}>
              <button onClick={() => handleNew()} className="toolbar-btn" title="New page">
                <Plus size={15} />
              </button>
              {isMobile && (
                <button onClick={() => setSidebarOpen(false)} className="toolbar-btn">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => { setSearchOpen(true); setSidebarOpen(false) }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.6rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'text', transition: 'border-color var(--transition)' }}
          >
            <Search size={13} />
            <span>Search… {!isMobile && '(⌘K)'}</span>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: '0.5rem 0.5rem 0', overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }}>
          <SidebarLink icon={<Home size={14} />} label="Home" to="/" navigate={navigate} location={location} onNavigate={() => setSidebarOpen(false)} />
          <SidebarLink icon={<Files size={14} />} label="All Files" to="/files" navigate={navigate} location={location} onNavigate={() => setSidebarOpen(false)} />
          <SidebarLink icon={<Trash2 size={14} />} label="Trash" to="/trash" navigate={navigate} location={location} onNavigate={() => setSidebarOpen(false)} />

          {favPages.length > 0 && (
            <>
              <SectionLabel>Favorites</SectionLabel>
              {favPages.map(p => (
                <PageTreeItem key={p.id} page={p} depth={0} isActive={isActive} navigate={navigate}
                  onContextMenu={handleContextMenu} onNew={handleNew} collapsed={collapsed} toggleCollapse={toggleCollapse}
                  onNavigate={() => setSidebarOpen(false)} />
              ))}
            </>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0.5rem 0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pages</span>
            <button onClick={() => handleNew()} className="toolbar-btn" style={{ width: 22, height: 22 }}>
              <Plus size={12} />
            </button>
          </div>
          {pages.length === 0 ? (
            <div style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
              No pages yet.<br />
              <button onClick={() => handleNew()} style={{ color: 'var(--accent)', cursor: 'pointer', marginTop: '0.25rem', fontSize: '0.8rem' }}>Create your first page →</button>
            </div>
          ) : (
            pages.map(p => (
              <PageTreeItem key={p.id} page={p} depth={0} isActive={isActive} navigate={navigate}
                onContextMenu={handleContextMenu} onNew={handleNew} collapsed={collapsed} toggleCollapse={toggleCollapse}
                onNavigate={() => setSidebarOpen(false)} />
            ))
          )}
        </nav>

        {/* Bottom actions */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '0.5rem' }}>
          <button className="sidebar-item w-full" onClick={() => { setShowImport(true); setSidebarOpen(false) }} style={{ justifyContent: 'flex-start' }}>
            <Upload size={13} /> <span style={{ fontSize: '0.8rem' }}>Import</span>
          </button>
          <button className="sidebar-item w-full" onClick={() => { setShowExport(true); setSidebarOpen(false) }} style={{ justifyContent: 'flex-start' }}>
            <Download size={13} /> <span style={{ fontSize: '0.8rem' }}>Export</span>
          </button>
        </div>
      </aside>

      {/* Resize handle (desktop only) */}
      {!isMobile && <div className="resize-handle" onMouseDown={startResize} />}

      {/* Context menu */}
      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 1999 }} onClick={() => setContextMenu(null)} />
          <div className="context-menu" style={isMobile ? {} : { left: contextMenu.x, top: contextMenu.y }}>
            <div className="context-menu-item" onClick={() => { navigate(`/page/${contextMenu.page.id}`); setContextMenu(null) }}>
              <FileText size={14} /> Open
            </div>
            <div className="context-menu-item" onClick={() => { navigate(`/kanban/${contextMenu.page.id}`); setContextMenu(null) }}>
              <Kanban size={14} /> Open as Kanban
            </div>
            <div className="context-menu-item" onClick={() => handleNew(contextMenu.page.id)}>
              <Plus size={14} /> Add sub-page
            </div>
            <div className="context-menu-item" onClick={() => handleRename(contextMenu.page)}>
              ✏️ Rename
            </div>
            <div className="context-menu-item" onClick={() => handleDuplicate(contextMenu.page.id)}>
              📋 Duplicate
            </div>
            <div className="context-menu-item" onClick={() => handleToggleFav(contextMenu.page)}>
              ⭐ {contextMenu.page.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            </div>
            <div className="context-menu-divider" />
            <div className="context-menu-item danger" onClick={() => { deletePage(contextMenu.page.id); setContextMenu(null) }}>
              <Trash2 size={14} /> Move to trash
            </div>
          </div>
        </>
      )}

      {showImport && <ImportModal onClose={() => { setShowImport(false); loadPages() }} />}
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </>
  )
}

function PageTreeItem({ page, depth, isActive, navigate, onContextMenu, onNew, collapsed, toggleCollapse, onNavigate }) {
  const hasChildren = page.children && page.children.length > 0
  const isCollapsed = collapsed[page.id]

  return (
    <div>
      <div
        className={`sidebar-item ${isActive(page.id) ? 'active' : ''}`}
        style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
        onClick={() => { navigate(`/page/${page.id}`); onNavigate?.() }}
        onContextMenu={(e) => onContextMenu(e, page)}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); toggleCollapse(page.id) }}
            style={{ display: 'flex', padding: 2, color: 'var(--text-muted)', flexShrink: 0 }}>
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : <span style={{ width: 16 }} />}
        <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{page.icon || '📄'}</span>
        <span className="truncate" style={{ fontSize: '0.85rem', flex: 1 }}>{page.title || 'Untitled'}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onNew(page.id) }}
          className="toolbar-btn" style={{ width: 20, height: 20, opacity: 0, transition: 'opacity var(--transition)' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0'}
        >
          <Plus size={11} />
        </button>
      </div>
      {hasChildren && !isCollapsed && page.children.map(child => (
        <PageTreeItem key={child.id} page={child} depth={depth + 1}
          isActive={isActive} navigate={navigate} onContextMenu={onContextMenu}
          onNew={onNew} collapsed={collapsed} toggleCollapse={toggleCollapse}
          onNavigate={onNavigate} />
      ))}
    </div>
  )
}

function SidebarLink({ icon, label, to, navigate, location, onNavigate }) {
  const active = location.pathname === to
  return (
    <div className={`sidebar-item ${active ? 'active' : ''}`} onClick={() => { navigate(to); onNavigate?.() }}>
      <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function SectionLabel({ children }) {
  return <div style={{ padding: '0.6rem 0.5rem 0.15rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{children}</div>
}

