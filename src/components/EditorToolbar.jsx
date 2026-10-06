import { useRef, useState } from 'react'
import { useEditorState } from '@tiptap/react'
import { CODE_LANGUAGES } from '../lib/highlight.js'

const SAFE_LINK = /^(?:https?:|mailto:)/i

// "example.com/page" -> "https://example.com/page"; anything that is not http(s) or mail is refused
const toLink = (input) => {
  const text = input.trim()
  if (!text) return null
  if (SAFE_LINK.test(text)) return text
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) || text.startsWith('//')) return null
  return /^[^\s/]+\.[^\s/]+/.test(text) ? `https://${text}` : null
}

function Tool({ label, shortcut, active = false, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      // keep the selection in the editor when a button is pressed
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="min-w-9 border border-rule px-2 py-1.5 font-sans text-sm leading-none text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
    >
      {children}
    </button>
  )
}

const Group = ({ label, children }) => (
  <div role="group" aria-label={label} className="flex flex-wrap gap-1">
    {children}
  </div>
)

// The formatting bar above the editor. `onPickImage` is called with the file the writer chose.
export default function EditorToolbar({ editor, onPickImage, uploading }) {
  const fileInput = useRef(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkError, setLinkError] = useState('')

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      h4: e.isActive('heading', { level: 4 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      link: e.isActive('link'),
      image: e.isActive('image'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      language: e.getAttributes('codeBlock').language ?? '',
      imageAlt: e.getAttributes('image').alt ?? '',
      href: e.getAttributes('link').href ?? '',
    }),
  })

  const run = (command) => () => command(editor.chain().focus()).run()

  const openLink = () => {
    setLinkText(state.href)
    setLinkError('')
    setLinkOpen(true)
  }

  const applyLink = (event) => {
    event.preventDefault()
    const href = toLink(linkText)
    if (!href) {
      setLinkError('Enter a web address (https://…) or an email address (mailto:…).')
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
    setLinkOpen(false)
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkOpen(false)
  }

  return (
    <div className="mb-2 space-y-2">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-x-3 gap-y-2">
        <Group label="Text style">
          <Tool label="Bold" shortcut="Ctrl+B" active={state.bold} onClick={run((c) => c.toggleBold())}>
            <strong>B</strong>
          </Tool>
          <Tool label="Italic" shortcut="Ctrl+I" active={state.italic} onClick={run((c) => c.toggleItalic())}>
            <em>I</em>
          </Tool>
          <Tool label="Strikethrough" shortcut="Ctrl+Shift+S" active={state.strike} onClick={run((c) => c.toggleStrike())}>
            <s>S</s>
          </Tool>
          <Tool label="Inline code" shortcut="Ctrl+E" active={state.code} onClick={run((c) => c.toggleCode())}>
            {'</>'}
          </Tool>
        </Group>
        <Group label="Headings">
          <Tool label="Heading 2" active={state.h2} onClick={run((c) => c.toggleHeading({ level: 2 }))}>
            H2
          </Tool>
          <Tool label="Heading 3" active={state.h3} onClick={run((c) => c.toggleHeading({ level: 3 }))}>
            H3
          </Tool>
          <Tool label="Heading 4" active={state.h4} onClick={run((c) => c.toggleHeading({ level: 4 }))}>
            H4
          </Tool>
        </Group>
        <Group label="Blocks">
          <Tool label="Bulleted list" active={state.bullet} onClick={run((c) => c.toggleBulletList())}>
            • List
          </Tool>
          <Tool label="Numbered list" active={state.ordered} onClick={run((c) => c.toggleOrderedList())}>
            1. List
          </Tool>
          <Tool label="Quote" active={state.quote} onClick={run((c) => c.toggleBlockquote())}>
            “ ”
          </Tool>
          <Tool label="Code block" active={state.codeBlock} onClick={run((c) => c.toggleCodeBlock())}>
            {'{ }'}
          </Tool>
          <Tool label="Horizontal rule" onClick={run((c) => c.setHorizontalRule())}>
            —
          </Tool>
        </Group>
        <Group label="Insert">
          <Tool label="Link" active={state.link} onClick={openLink}>
            Link
          </Tool>
          <Tool label="Image" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? 'Uploading…' : 'Image'}
          </Tool>
        </Group>
        <Group label="History">
          <Tool label="Undo" shortcut="Ctrl+Z" disabled={!state.canUndo} onClick={run((c) => c.undo())}>
            ↶
          </Tool>
          <Tool label="Redo" shortcut="Ctrl+Shift+Z" disabled={!state.canRedo} onClick={run((c) => c.redo())}>
            ↷
          </Tool>
        </Group>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose an image to insert"
          onChange={(event) => {
            const [file] = event.target.files
            event.target.value = ''
            if (file) onPickImage(file)
          }}
        />
      </div>

      {linkOpen && (
        <form onSubmit={applyLink} className="flex flex-wrap items-end gap-2 border border-rule bg-paper-2 p-3">
          <label className="min-w-56 flex-1">
            <span className="kicker mb-1 block text-ink-soft">Link address</span>
            <input
              autoFocus
              value={linkText}
              onChange={(event) => setLinkText(event.target.value)}
              placeholder="https://example.com"
              className="w-full border-0 border-b border-ink bg-transparent px-1 py-1.5 font-serif text-base focus:border-b-2 focus:border-accent focus:outline-none"
            />
          </label>
          <button type="submit" className="border border-ink bg-ink px-3 py-1.5 font-sans text-sm text-paper">
            Apply
          </button>
          {state.link && (
            <button type="button" onClick={removeLink} className="border border-rule px-3 py-1.5 font-sans text-sm">
              Remove link
            </button>
          )}
          <button type="button" onClick={() => setLinkOpen(false)} className="px-2 py-1.5 font-sans text-sm text-ink-soft">
            Cancel
          </button>
          {linkError && (
            <p role="alert" className="w-full font-sans text-sm text-danger">
              {linkError}
            </p>
          )}
        </form>
      )}

      {state.image && (
        <label className="block border border-rule bg-paper-2 p-3">
          <span className="kicker mb-1 block text-ink-soft">Image description (read aloud by screen readers)</span>
          <input
            value={state.imageAlt}
            onChange={(event) => editor.chain().updateAttributes('image', { alt: event.target.value }).run()}
            placeholder="Describe what the picture shows"
            className="w-full border-0 border-b border-ink bg-transparent px-1 py-1.5 font-serif text-base focus:border-b-2 focus:border-accent focus:outline-none"
          />
        </label>
      )}

      {state.codeBlock && (
        <label className="flex items-center gap-3">
          <span className="kicker text-ink-soft">Language</span>
          <select
            aria-label="Language"
            value={state.language}
            onChange={(event) => editor.chain().focus().updateAttributes('codeBlock', { language: event.target.value || null }).run()}
            className="border border-rule bg-paper-2 px-2 py-1 font-sans text-sm"
          >
            {CODE_LANGUAGES.map(([name, value]) => (
              <option key={value || 'plain'} value={value}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
