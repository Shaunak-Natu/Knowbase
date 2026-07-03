import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { kanbanApi, pagesApi } from '../lib/api'
import { Plus, Trash2, Edit2, FileText, MoreHorizontal, X, ChevronLeft, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

export default function KanbanPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState([])
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editCard, setEditCard] = useState(null)
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const loadBoard = useCallback(async () => {
    try {
      const [boardRes, pageRes] = await Promise.all([
        kanbanApi.getBoard(id),
        pagesApi.get(id),
      ])
      setBoard(boardRes.data)
      setPage(pageRes.data)
    } catch (err) {
      toast.error('Failed to load board')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadBoard() }, [loadBoard])

  const addColumn = async () => {
    const title = prompt('Column name:', 'New Column')
    if (!title) return
    await kanbanApi.createColumn(id, { title })
    loadBoard()
  }

  const deleteColumn = async (colId) => {
    if (!confirm('Delete this column? Cards will be moved to the first column.')) return
    await kanbanApi.deleteColumn(colId)
    loadBoard()
    toast.success('Column deleted')
  }

  const renameColumn = async (col) => {
    const title = prompt('New name:', col.title)
    if (!title || title === col.title) return
    await kanbanApi.updateColumn(col.id, { title })
    loadBoard()
  }

  const addCard = async (colId) => {
    const title = prompt('Card title:', '')
    if (!title) return
    await kanbanApi.createCard(id, { column_id: colId, title })
    loadBoard()
  }

  const deleteCard = async (cardId) => {
    await kanbanApi.deleteCard(cardId)
    loadBoard()
    setEditCard(null)
    toast.success('Card deleted')
  }

  const saveCard = async (cardId, updates) => {
    await kanbanApi.updateCard(cardId, updates)
    loadBoard()
    setEditCard(null)
  }

  // Drag and drop
  const findCard = (cardId) => {
    for (const col of board) {
      const card = col.cards?.find(c => c.id === cardId)
      if (card) return { card, colId: col.id }
    }
    return null
  }

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragOver = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const activeInfo = findCard(active.id)
    if (!activeInfo) return

    // Check if dragging over a column
    const targetCol = board.find(c => c.id === over.id)
    const targetCardInfo = findCard(over.id)

    const toColId = targetCol ? targetCol.id : targetCardInfo?.colId

    if (!toColId || toColId === activeInfo.colId) return

    setBoard(prev => prev.map(col => {
      if (col.id === activeInfo.colId) {
        return { ...col, cards: col.cards.filter(c => c.id !== active.id) }
      }
      if (col.id === toColId) {
        return { ...col, cards: [...(col.cards || []), { ...activeInfo.card, column_id: toColId }] }
      }
      return col
    }))
  }

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over) return

    const activeInfo = findCard(active.id)
    if (!activeInfo) return

    const targetCol = board.find(c => c.id === over.id)
    const targetCardInfo = findCard(over.id)
    const toColId = targetCol ? targetCol.id : targetCardInfo?.colId

    if (toColId) {
      try {
        await kanbanApi.updateCard(active.id, { column_id: toColId })
      } catch { toast.error('Failed to move card') }
    }
    loadBoard()
  }

  const activeCard = activeId ? findCard(activeId)?.card : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
      Loading board…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0 1rem', height: 'var(--topbar-height)',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0
      }}>
        <button className="toolbar-btn" onClick={() => navigate(`/page/${id}`)} title="Back to page">
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 600 }}>{page?.icon} {page?.title} — Kanban</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.25rem' }}>
          <button onClick={() => navigate(`/page/${id}`)} className="toolbar-btn" title="Document view">
            <FileText size={15} />
          </button>
          <button
            onClick={addColumn}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.3rem 0.75rem', background: 'var(--accent)', color: 'white',
              borderRadius: 'var(--radius-md)', fontSize: '0.825rem', fontWeight: 500, cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Add column
          </button>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {board.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              onAddCard={() => addCard(col.id)}
              onDeleteCol={() => deleteColumn(col.id)}
              onRenameCol={() => renameColumn(col)}
              onEditCard={setEditCard}
            />
          ))}
          <button
            onClick={addColumn}
            style={{
              flexShrink: 0, width: 280, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', background: 'var(--bg-tertiary)', border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)', fontSize: '0.875rem',
              cursor: 'pointer', transition: 'all var(--transition)'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Plus size={16} /> Add column
          </button>
        </div>
        <DragOverlay>
          {activeCard && <CardOverlay card={activeCard} />}
        </DragOverlay>
      </DndContext>

      {/* Edit card modal */}
      {editCard && (
        <CardModal card={editCard} onSave={saveCard} onDelete={deleteCard} onClose={() => setEditCard(null)} />
      )}
    </div>
  )
}

function KanbanColumn({ col, onAddCard, onDeleteCol, onRenameCol, onEditCard }) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="kanban-column" id={col.id}>
      <div className="kanban-column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color || 'var(--accent)', flexShrink: 0 }} />
          <span>{col.title}</span>
          <span style={{ background: 'var(--bg-active)', padding: '0.1rem 0.4rem', borderRadius: '100px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {col.cards?.length || 0}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.1rem' }}>
          <button className="toolbar-btn" onClick={onAddCard} title="Add card"><Plus size={13} /></button>
          <div style={{ position: 'relative' }}>
            <button className="toolbar-btn" onClick={() => setShowMenu(v => !v)}><MoreHorizontal size={13} /></button>
            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowMenu(false)} />
                <div className="context-menu" style={{ position: 'absolute', right: 0, top: '110%', zIndex: 1000 }}>
                  <div className="context-menu-item" onClick={() => { onRenameCol(); setShowMenu(false) }}><Edit2 size={13} /> Rename</div>
                  <div className="context-menu-item danger" onClick={() => { onDeleteCol(); setShowMenu(false) }}><Trash2 size={13} /> Delete column</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <SortableContext items={(col.cards || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-cards">
          {(col.cards || []).map(card => (
            <SortableCard key={card.id} card={card} onEdit={() => onEditCard(card)} />
          ))}
        </div>
      </SortableContext>

      <div style={{ padding: '0.5rem' }}>
        <button
          onClick={onAddCard}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem', width: '100%',
            padding: '0.4rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.825rem',
            cursor: 'pointer', borderRadius: 'var(--radius-sm)', transition: 'all var(--transition)'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <Plus size={13} /> Add card
        </button>
      </div>
    </div>
  )
}

function SortableCard({ card, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="kanban-card" onClick={onEdit}>
        <div style={{ borderLeft: `3px solid ${card.color || 'var(--accent)'}`, paddingLeft: '0.5rem' }}>
          <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: card.description ? '0.35rem' : 0 }}>
            {card.title}
          </div>
          {card.description && (
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {card.description}
            </div>
          )}
          {card.due_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Calendar size={11} /> {card.due_date}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CardOverlay({ card }) {
  return (
    <div className="kanban-card" style={{ opacity: 0.9, boxShadow: 'var(--shadow-lg)', transform: 'rotate(2deg)' }}>
      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{card.title}</div>
    </div>
  )
}

function CardModal({ card, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')
  const [dueDate, setDueDate] = useState(card.due_date || '')
  const [color, setColor] = useState(card.color || '#6366f1')
  const colors = ['#00d4aa', '#388bfd', '#3fb950', '#d29922', '#f85149', '#8b5cf6', '#ec4899', '#8b949e']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 460 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600 }}>Edit Card</h3>
          <button className="toolbar-btn" onClick={onClose}><X size={15} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Color</label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {colors.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer', boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'space-between' }}>
          <button onClick={() => { if (confirm('Delete this card?')) onDelete(card.id) }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', color: 'var(--error)', background: 'var(--danger-dim)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.825rem' }}>
            <Trash2 size={13} /> Delete
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} style={{ padding: '0.4rem 0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.825rem' }}>
              Cancel
            </button>
            <button onClick={() => onSave(card.id, { title, description, color, due_date: dueDate || null })}
              style={{ padding: '0.4rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.825rem', fontWeight: 500 }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
