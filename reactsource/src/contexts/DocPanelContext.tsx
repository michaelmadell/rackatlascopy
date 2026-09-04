import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { usePostHog } from 'posthog-js/react'
import { getLocale } from '@/paraglide/runtime'
import DocPanel from '@/components/common/DocPanel'

interface DocPanelContextValue {
  openDoc: (slug: string) => void
}

const DocPanelContext = createContext<DocPanelContextValue | null>(null)

const docImports: Record<string, () => Promise<string>> = {}
const i18nDocImports: Record<string, () => Promise<string>> = {}

function resolveImportKey(imports: Record<string, () => Promise<string>>, slug: string): string | undefined {
  const suffixes = [`/${slug}`, `/${slug}.md`, `/${slug}/index.md`]
  for (const key of Object.keys(imports)) {
    if (suffixes.some((s) => key.endsWith(s))) return key
  }
  return undefined
}

// Docusaurus serves a doc at <folder>/<frontmatter-slug> when the slug is relative (no leading /),
// or at the slug itself when absolute. Our `docSlug` is the file path, whose leaf usually equals the
// slug — but not always (e.g. administration/subscription-billing has slug `billing`). Swap only the
// leaf so the external link resolves to the real page instead of a soft-404 fallback.
function publishedPathFor(docSlug: string, frontmatterSlug: string | null): string {
  if (!frontmatterSlug) return docSlug
  if (frontmatterSlug.startsWith('/')) return frontmatterSlug.replace(/^\//, '')
  const lastSlash = docSlug.lastIndexOf('/')
  const folder = lastSlash >= 0 ? docSlug.slice(0, lastSlash) : ''
  return folder ? `${folder}/${frontmatterSlug}` : frontmatterSlug
}

export function DocPanelProvider({ children }: { children: ReactNode }) {
  const posthog = usePostHog()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [anchor, setAnchor] = useState<string | null>(null)

  const openDoc = useCallback(
    async (input: string) => {
      const hashIndex = input.indexOf('#')
      const docSlug = hashIndex >= 0 ? input.slice(0, hashIndex) : input
      const docAnchor = hashIndex >= 0 ? input.slice(hashIndex + 1) : null

      posthog?.capture('app:doc_panel_open', { slug: docSlug })

      setSlug(docSlug)
      setAnchor(docAnchor)
      setContent(null)
      setTitle(null)
      setOpen(true)

      const locale = getLocale()
      let key: string | undefined
      let imports = docImports

      if (locale !== 'en') {
        key = resolveImportKey(i18nDocImports, docSlug)
        if (key) imports = i18nDocImports
      }

      if (!key) {
        key = resolveImportKey(docImports, docSlug)
        imports = docImports
      }

      if (!key) {
        setContent(`Documentation page "${docSlug}" not found.`)
        return
      }

      try {
        const raw = await imports[key]()
        const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---/)
        const titleMatch = frontmatterMatch?.[1].match(/^title:\s*(.+)$/m)
        setTitle(titleMatch?.[1] ?? null)
        const slugMatch = frontmatterMatch?.[1].match(/^slug:\s*(.+)$/m)
        setSlug(publishedPathFor(docSlug, slugMatch?.[1].trim() ?? null))
        // Strip frontmatter and MDX `{/* … */}` comment blocks (e.g. docshot config), which Docusaurus
        // drops but react-markdown would render as literal text. `:::` admonition markers are kept and
        // handled by remarkAdmonitions in DocPanel.
        // `<Video … />` is an MDX component: rehypeRaw lowercases it to a native `<video>` and ignores the
        // self-closing slash, swallowing the rest of the article as children. Emit an explicit close tag.
        setContent(
          raw
            .replace(/^---[\s\S]*?---\n*/, '')
            .replace(/\{\/\*[\s\S]*?\*\/\}\n*/g, '')
            .replace(/<Video\s+([^>]*?)\/>/g, '<video $1></video>')
        )
      } catch {
        setContent(`Failed to load documentation page "${docSlug}".`)
      }
    },
    [posthog]
  )

  return (
    <DocPanelContext.Provider value={{ openDoc }}>
      {children}
      <DocPanel open={open} onOpenChange={setOpen} content={content} title={title} slug={slug} anchor={anchor} />
    </DocPanelContext.Provider>
  )
}

export function useDocPanel() {
  const ctx = useContext(DocPanelContext)
  if (!ctx) throw new Error('useDocPanel must be used within DocPanelProvider')
  return ctx
}
