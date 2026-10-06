// Syntax colours for code blocks. The highlighter (about 100 kB) is loaded only when a page actually
// has a code block, and its result is built from DOM nodes and text, never from an HTML string, so code
// can never turn into markup.
let loading

const loadLowlight = () => {
  loading ??= import('lowlight').then(({ common, createLowlight }) => createLowlight(common))
  return loading
}

// the languages offered in the editor: [label, name used in the class "language-<name>"]
export const CODE_LANGUAGES = [
  ['Plain text', ''],
  ['JavaScript', 'javascript'],
  ['TypeScript', 'typescript'],
  ['JSON', 'json'],
  ['HTML / XML', 'xml'],
  ['CSS', 'css'],
  ['Bash', 'bash'],
  ['Python', 'python'],
  ['SQL', 'sql'],
  ['Java', 'java'],
  ['Go', 'go'],
  ['Rust', 'rust'],
  ['PHP', 'php'],
  ['Ruby', 'ruby'],
  ['C', 'c'],
  ['C++', 'cpp'],
  ['C#', 'csharp'],
  ['YAML', 'yaml'],
  ['Markdown', 'markdown'],
  ['Diff', 'diff'],
]

// a node of lowlight's tree -> a DOM node
const toDom = (node) => {
  if (node.type === 'text') return document.createTextNode(node.value)
  if (node.type !== 'element') return document.createDocumentFragment()
  const element = document.createElement('span')
  const classes = node.properties?.className ?? []
  if (classes.length > 0) element.className = classes.filter((name) => /^hljs(-[a-z0-9_-]+)*$/.test(name)).join(' ')
  element.append(...node.children.map(toDom))
  return element
}

export const highlightCodeBlocks = async (root) => {
  const blocks = [...root.querySelectorAll('pre code[class*="language-"]')].filter((code) => !code.dataset.highlighted)
  if (blocks.length === 0) return
  const lowlight = await loadLowlight()
  for (const code of blocks) {
    if (!code.isConnected) continue
    const language = [...code.classList].find((name) => name.startsWith('language-'))?.slice('language-'.length)
    if (!language || !lowlight.registered(language)) continue
    code.replaceChildren(...lowlight.highlight(language, code.textContent).children.map(toDom))
    code.dataset.highlighted = 'true'
  }
}
