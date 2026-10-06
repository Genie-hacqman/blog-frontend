import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { uploadImage } from '../api/media.js'
import EditorToolbar from './EditorToolbar.jsx'

const lowlight = createLowlight(common)

const IMAGE_TYPES = /^image\/(?:jpeg|png|webp|gif)$/
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

// the editor keeps an empty paragraph after a block (so there is always a place to carry on typing); it is not content
const tidy = (html) => html.replace(/(?:<p><\/p>)+$/, '')

const imageFiles = (list) => [...(list ?? [])].filter((file) => file.type.startsWith('image/'))

// The writing surface. It produces HTML (`onChange` gets '' when the document is empty); the API
// sanitizes whatever is sent, so nothing here is a security boundary, only the author's tool.
// Loaded on demand (React.lazy in PostForm): readers never download it.
export default function RichTextEditor({ value, onChange, onBlur, label = 'Content', describedBy }) {
  const editorRef = useRef(null)
  const [uploads, setUploads] = useState({ pending: 0, error: '' })

  const insertImage = useCallback(async (file) => {
    if (!IMAGE_TYPES.test(file.type)) {
      setUploads((s) => ({ ...s, error: 'Only JPEG, PNG, WebP or GIF pictures can be added.' }))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploads((s) => ({ ...s, error: 'That picture is larger than 5 MB.' }))
      return
    }
    setUploads((s) => ({ pending: s.pending + 1, error: '' }))
    try {
      const media = await uploadImage(file, 'inline')
      editorRef.current?.chain().focus().setImage({ src: media.url, alt: '' }).run()
    } catch (error) {
      setUploads((s) => ({ ...s, error: error.message }))
    } finally {
      setUploads((s) => ({ ...s, pending: s.pending - 1 }))
    }
  }, [])

  const editor = useEditor({
    content: value || '',
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          isAllowedUri: (url) => /^(?:https?:|mailto:)/i.test(url),
          HTMLAttributes: { rel: 'noopener noreferrer nofollow ugc', target: null },
        },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: 'Tell your story…' }),
    ],
    editorProps: {
      attributes: {
        class: 'article-body editor-surface',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        ...(describedBy && { 'aria-describedby': describedBy }),
      },
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData?.files)
        if (files.length === 0) return false
        event.preventDefault()
        files.forEach(insertImage)
        return true
      },
      handleDrop: (_view, event) => {
        const files = imageFiles(event.dataTransfer?.files)
        if (files.length === 0) return false
        event.preventDefault()
        files.forEach(insertImage)
        return true
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : tidy(e.getHTML())),
    onBlur: () => onBlur?.(),
  })

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // a saved version coming back from the server replaces what is shown, but never while the writer is typing
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const current = editor.isEmpty ? '' : tidy(editor.getHTML())
    if ((value || '') !== current) editor.commands.setContent(value || '', { emitUpdate: false })
  }, [editor, value])

  if (!editor) return <div className="editor-surface" aria-busy="true" />

  return (
    <div>
      <EditorToolbar editor={editor} onPickImage={insertImage} uploading={uploads.pending > 0} />
      <EditorContent editor={editor} />
      <p role="status" aria-live="polite" className="mt-2 min-h-5 font-sans text-sm text-ink-soft">
        {uploads.pending > 0 ? 'Uploading picture…' : ''}
      </p>
      {uploads.error && (
        <p role="alert" className="font-sans text-sm text-danger">
          {uploads.error}
        </p>
      )}
    </div>
  )
}
