// Tao Lexical JSON thu cong tu HTML don gian (h1-h4, p, ul/ol/li, strong, em, a, hr).
// Node dung format chuan cua lexical ma @payloadcms/richtext-lexical render.
// Ly do: convertHTMLToLexical can editorConfig day du (resolvedFeatureMap) ma
// khong the lay duoc ngoai server field cua Payload; node thang la cach on dinh.

type Node = Record<string, any>

let key = 0
const nextKey = () => (key++).toString(36).padStart(5, '0')

function textNode(text: string, formats: number[] = []): Node {
  return { type: 'text', text, format: formats.reduce((a, b) => a | (1 << b), 0), detail: 0, mode: 'normal', style: '', version: 1 }
}
function para(children: Node[]): Node {
  return { type: 'paragraph', children, direction: null, format: '', indent: 0, textFormat: 0, style: '', version: 1 }
}

// parse inline: strong -> format 1, em -> format 2
function parseInline(s: string): Node[] {
  const out: Node[] = []
  const re = /<(strong|em)>(.*?)<\/\1>|<a href="([^"]+)">(.*?)<\/a>/g
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(textNode(s.slice(last, m.index)))
    if (m[1]) out.push(textNode(m[2], [m[1] === 'strong' ? 1 : 2]))
    else out.push({ type: 'link', fields: { linkType: 'custom', url: m[3], newTab: true }, children: [textNode(m[4])], direction: null, format: '', indent: 0, version: 1 })
    last = re.lastIndex
  }
  if (last < s.length) out.push(textNode(s.slice(last)))
  return out
}

export function htmlToLexical(html: string): { root: Node } {
  key = 0
  const lines = html.split('\n')
  const rootChildren: Node[] = []
  let listNode: Node | null = null

  const closeList = () => { if (listNode) { rootChildren.push(listNode); listNode = null } }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { closeList(); continue }

    let m: RegExpMatchArray | null
    if ((m = line.match(/^<h([1-4])>(.*)<\/h\1>$/))) {
      closeList()
      rootChildren.push({ type: 'heading', tag: 'h' + m[1], children: parseInline(m[2]), direction: null, format: '', indent: 0, textFormat: 0, style: '', version: 1 })
    } else if (line.startsWith('<ul>')) {
      closeList()
      listNode = { type: 'list', listType: 'bullet', start: 1, tag: 'ul', children: [], direction: null, format: '', indent: 0, version: 1 }
    } else if (line.startsWith('<ol>')) {
      closeList()
      listNode = { type: 'list', listType: 'number', start: 1, tag: 'ol', children: [], direction: null, format: '', indent: 0, version: 1 }
    } else if ((m = line.match(/^<li>(.*)<\/li>$/))) {
      if (listNode) {
        listNode.children.push({
          type: 'listitem',
          checked: undefined,
          value: 1,
          children: parseInline(m[1]),
          direction: null,
          format: '',
          indent: 0,
          version: 1,
        })
      }
    } else if (/^<hr\/>$/.test(line)) {
      closeList()
      rootChildren.push({ type: 'horizontalrule', version: 1 })
    } else if ((m = line.match(/^<p>(.*)<\/p>$/))) {
      closeList(); rootChildren.push(para(parseInline(m[1])))
    } else {
      closeList(); rootChildren.push(para(parseInline(line)))
    }
  }
  closeList()
  return { root: { type: 'root', children: rootChildren, direction: null, format: '', indent: 0, version: 1 } }
}
