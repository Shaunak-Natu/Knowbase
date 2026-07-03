import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect, useCallback, useRef } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Link as LinkIcon,
  List, ListOrdered, CheckSquare, Quote, Minus, Table as TableIcon,
  Heading1, Heading2, Heading3, Highlighter, Image as ImageIcon, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight, Type
} from 'lucide-react'

export default function RichEditor({ content, onChange, onFileInsert, pageId }) {
  const saveTimer = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: 'code-block' } },
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: "Start writing… type '/' for commands" }),
      Table.configure({ resizable: true }),
      TableRow, TableCell, TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
    ],
    content: content || '',
    editorProps: {
      attributes: { class: 'ProseMirror' },
      handleDrop: (view, event, slice, moved) => {
        const files = event.dataTransfer?.files
        if (files && files.length > 0 && onFileInsert) {
          event.preventDefault()
          onFileInsert(Array.from(files))
          return true
        }
        return false
      },
      handlePaste: (view, event) => {
        const files = event.clipboardData?.files
        if (files && files.length > 0 && onFileInsert) {
          const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
          if (imageFiles.length > 0) {
            event.preventDefault()
            onFileInsert(imageFiles)
            return true
          }
        }
        return false
      }
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        onChange?.(editor.getJSON())
      }, 600)
    },
  })

  useEffect(() => {
    if (!editor || !content) return
    const current = JSON.stringify(editor.getJSON())
    const next = typeof content === 'string' ? content : JSON.stringify(content)
    if (current !== next) {
      try {
        const parsed = typeof content === 'string' ? JSON.parse(content) : content
        editor.commands.setContent(parsed, false)
      } catch { editor.commands.setContent(content, false) }
    }
  }, []) // only on mount

  const insertImage = useCallback((url, alt = '') => {
    editor?.chain().focus().setImage({ src: url, alt }).run()
  }, [editor])

  const setLink = useCallback(() => {
    const prev = editor?.getAttributes('link').href
    const url = prompt('URL:', prev || 'https://')
    if (url === null) return
    if (url === '') { editor?.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const insertTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) return null

  const wordCount = editor.storage.characterCount?.words() || 0
  const charCount = editor.storage.characterCount?.characters() || 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <ToolBtn title="Undo (⌘Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo size={14} />
        </ToolBtn>
        <ToolBtn title="Redo (⌘Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo size={14} />
        </ToolBtn>
        <div className="toolbar-divider" />

        <ToolBtn title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })}>
          <Heading1 size={14} />
        </ToolBtn>
        <ToolBtn title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>
          <Heading2 size={14} />
        </ToolBtn>
        <ToolBtn title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>
          <Heading3 size={14} />
        </ToolBtn>
        <div className="toolbar-divider" />

        <ToolBtn title="Bold (⌘B)" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn title="Italic (⌘I)" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          <Italic size={14} />
        </ToolBtn>
        <ToolBtn title="Underline (⌘U)" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
          <UnderlineIcon size={14} />
        </ToolBtn>
        <ToolBtn title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
          <Strikethrough size={14} />
        </ToolBtn>
        <ToolBtn title="Highlight" onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')}>
          <Highlighter size={14} />
        </ToolBtn>
        <ToolBtn title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')}>
          <Code size={14} />
        </ToolBtn>
        <ToolBtn title="Link (⌘K)" onClick={setLink} active={editor.isActive('link')}>
          <LinkIcon size={14} />
        </ToolBtn>
        <div className="toolbar-divider" />

        <ToolBtn title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          <List size={14} />
        </ToolBtn>
        <ToolBtn title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          <ListOrdered size={14} />
        </ToolBtn>
        <ToolBtn title="Task list" onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')}>
          <CheckSquare size={14} />
        </ToolBtn>
        <ToolBtn title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>
          <Quote size={14} />
        </ToolBtn>
        <ToolBtn title="Code block" onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')}>
          <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700 }}>{'</>'}</span>
        </ToolBtn>
        <ToolBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={14} />
        </ToolBtn>
        <ToolBtn title="Insert table" onClick={insertTable}>
          <TableIcon size={14} />
        </ToolBtn>
        <ToolBtn title="Insert image URL" onClick={() => {
          const url = prompt('Image URL:')
          if (url) insertImage(url)
        }}>
          <ImageIcon size={14} />
        </ToolBtn>
      </div>

      {/* Editor */}
      <div className="tiptap-editor flex-1 overflow-auto" style={{ padding: '2rem 4rem' }}>
        <EditorContent editor={editor} style={{ minHeight: '100%' }} />
      </div>

      {/* Bubble menu for selected text */}
      <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
        <div style={{
          display: 'flex', gap: 2, background: 'var(--bg-secondary)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          padding: '0.25rem', boxShadow: 'var(--shadow-md)'
        }}>
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><Highlighter size={13} /></ToolBtn>
          <ToolBtn onClick={setLink} active={editor.isActive('link')} title="Link"><LinkIcon size={13} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code"><Code size={13} /></ToolBtn>
        </div>
      </BubbleMenu>

      {/* Status bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.25rem 1rem',
        borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)',
        background: 'var(--bg-secondary)'
      }}>
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
        <span style={{ marginLeft: 'auto' }}>Drop files to attach • Paste images to embed</span>
      </div>
    </div>
  )
}

function ToolBtn({ children, onClick, active, disabled, title }) {
  return (
    <button
      className={`toolbar-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ opacity: disabled ? 0.3 : 1 }}
    >
      {children}
    </button>
  )
}
