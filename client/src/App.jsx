import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import PageEditor from './pages/PageEditor'
import KanbanPage from './pages/KanbanPage'
import FilesPage from './pages/FilesPage'
import TrashPage from './pages/TrashPage'
import HomePage from './pages/HomePage'
import SearchPalette from './components/SearchPalette'
import { pagesApi, tagsApi } from './lib/api'
import toast from 'react-hot-toast'
import { Menu, Home, Files, Search, Plus, Trash2 } from 'lucide-react'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export default function App() {
  const [pages, setPages] = useState([])
  const [flatPages, setFlatPages] = useState([])
  const [tags, setTags] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadPages = useCallback(async () => {
    try {
      const res = await pagesApi.getAll()
      setPages(res.data.pages)
      setFlatPages(res.data.flat)
    } catch (err) {
      toast.error('Failed to load pages')
    }
  }, [])

  const loadTags = useCallback(async () => {
    try {
      const res = await tagsApi.getAll()
      setTags(res.data)
    } catch (err) { /* ignore */ }
  }, [])

  useEffect(() => {
    Promise.all([loadPages(), loadTags()]).finally(() => setLoading(false))
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
      if (e.key === 'Escape') { setSearchOpen(false); setSidebarOpen(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const createPage = useCallback(async (opts = {}) => {
    try {
      const res = await pagesApi.create({ title: 'Untitled', icon: '📄', ...opts })
      await loadPages()
      return res.data
    } catch (err) {
      toast.error('Failed to create page')
      return null
    }
  }, [loadPages])

  const deletePage = useCallback(async (id, permanent = false) => {
    try {
      await pagesApi.delete(id, permanent)
      await loadPages()
      toast.success(permanent ? 'Page permanently deleted' : 'Moved to trash')
    } catch (err) {
      toast.error('Failed to delete page')
    }
  }, [loadPages])

  const ctx = {
    pages, flatPages, tags, loading,
    loadPages, loadTags, createPage, deletePage, setTags,
    searchOpen, setSearchOpen,
    sidebarOpen, setSidebarOpen,
  }

  return (
    <AppContext.Provider value={ctx}>
      <BrowserRouter>
        <AppShell loading={loading} />
        {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '0.875rem' },
            success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--bg-secondary)' } },
            error: { iconTheme: { primary: 'var(--error)', secondary: 'var(--bg-secondary)' } },
          }}
        />
      </BrowserRouter>
    </AppContext.Provider>
  )
}

function AppShell({ loading }) {
  const { sidebarOpen, setSidebarOpen, setSearchOpen, createPage } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  // Close sidebar on navigation (mobile)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const handleNewPage = async () => {
    const { createPage: cp } = useApp()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} style={{ display: 'block' }} />
      )}

      <Sidebar />

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading KnowBase…</div>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/page/:id" element={<PageEditor />} />
            <Route path="/kanban/:id" element={<KanbanPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <button className={`mobile-nav-btn ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
          <Home size={20} /><span>Home</span>
        </button>
        <button className="mobile-nav-btn" onClick={() => setSearchOpen(true)}>
          <Search size={20} /><span>Search</span>
        </button>
        <MobileNewPageBtn />
        <button className={`mobile-nav-btn ${location.pathname === '/files' ? 'active' : ''}`} onClick={() => navigate('/files')}>
          <Files size={20} /><span>Files</span>
        </button>
        <button className="mobile-nav-btn" onClick={() => setSidebarOpen(v => !v)}>
          <Menu size={20} /><span>Menu</span>
        </button>
      </nav>
    </div>
  )
}

function MobileNewPageBtn() {
  const { createPage } = useApp()
  const navigate = useNavigate()
  return (
    <button className="mobile-nav-btn" onClick={async () => {
      const page = await createPage()
      if (page) navigate(`/page/${page.id}`)
    }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
        <Plus size={20} color="white" />
      </div>
      <span>New</span>
    </button>
  )
}
