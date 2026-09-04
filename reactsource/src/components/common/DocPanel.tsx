import { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkHeadingId from 'remark-heading-id'
import remarkDirective from 'remark-directive'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import type {} from 'mdast-util-directive'
import type { Root } from 'mdast'
import type { Plugin } from 'unified'
import { visit } from 'unist-util-visit'
import { Button, ScrollArea, Sheet, SheetContent, SheetHeader, SheetTitle } from '@patchdocs/ui'
import type { IconType } from 'react-icons'
import {
  TbAlertTriangle,
  TbBulb,
  TbExternalLink,
  TbFlame,
  TbInfoCircle,
  TbPencil,
  TbPlayerPlayFilled,
  TbX
} from 'react-icons/tb'
import { usePostHog } from 'posthog-js/react'
import { getLocale } from '@/paraglide/runtime'
import * as m from '@/paraglide/messages'

const DOCS_BASE_URL = import.meta.env.VITE_DOCS_BASE_URL

const ADMONITIONS: Record<string, { Icon: IconType; label: () => string }> = {
  note: { Icon: TbPencil, label: m.admonition_note },
  tip: { Icon: TbBulb, label: m.admonition_tip },
  info: { Icon: TbInfoCircle, label: m.admonition_info },
  warning: { Icon: TbAlertTriangle, label: m.admonition_warning },
  caution: { Icon: TbAlertTriangle, label: m.admonition_caution },
  danger: { Icon: TbFlame, label: m.admonition_danger }
}

// Docusaurus admonition types (`:::info`, `:::tip`, …) parse to remark `containerDirective` nodes.
// Turn the recognised ones into `<div class="admonition admonition-<type>">` so the `div` override
// below can render them with an icon + localized title. Unknown directives are left untouched.
const remarkAdmonitions: Plugin<[], Root> = () => (tree) => {
  visit(tree, (node) => {
    if (node.type !== 'containerDirective' || !ADMONITIONS[node.name]) return
    node.data ??= {}
    node.data.hName = 'div'
    node.data.hProperties = { className: ['admonition', `admonition-${node.name}`] }
  })
}

function rewriteHref(href: string | undefined) {
  if (!href) return href
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#')) return href
  return `${DOCS_BASE_URL}/${href.replace(/^\//, '').replace(/\.md($|#)/, '$1')}`
}

function rewriteImgSrc(src: string | undefined) {
  if (!src) return src
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src
  return `${DOCS_BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`
}

function YouTubeFacade({ id, title }: { id: string; title: string }) {
  const posthog = usePostHog()
  const [playing, setPlaying] = useState(false)
  const [hires, setHires] = useState(true)

  const play = () => {
    posthog?.capture('app:doc_panel_video_play', { video_id: id, title })
    setPlaying(true)
  }

  return (
    <div className="not-prose my-4">
      {playing ? (
        <iframe
          className="aspect-video w-full rounded-md border border-border overflow-hidden"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="relative aspect-video w-full rounded-md border border-border overflow-hidden cursor-pointer"
          onClick={play}
          aria-label={m.video_play({ title })}>
          <img
            className="size-full object-cover"
            src={`https://i.ytimg.com/vi/${id}/${hires ? 'maxresdefault' : 'hqdefault'}.jpg`}
            alt=""
            loading="lazy"
            onError={() => setHires(false)}
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 hover:bg-black/25 transition-colors">
            <TbPlayerPlayFilled className="size-12 text-white drop-shadow" aria-hidden />
          </span>
        </button>
      )}
    </div>
  )
}

interface DocPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string | null
  title: string | null
  slug: string
  anchor: string | null
}

export default function DocPanel({ open, onOpenChange, content, title, slug, anchor }: DocPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const locale = getLocale()
  const localePrefix = locale === 'de' ? '/de' : ''
  const anchorSuffix = anchor ? `#${anchor}` : ''
  const docsUrl = `${DOCS_BASE_URL}${localePrefix}/${slug.replace(/\.md$/, '')}${anchorSuffix}`

  useEffect(() => {
    if (!open || !content || !anchor) return
    const timeout = setTimeout(() => {
      const el = contentRef.current?.querySelector(`#${CSS.escape(anchor)}`)
      el?.scrollIntoView({ behavior: 'smooth' })
    }, 300)
    return () => clearTimeout(timeout)
  }, [open, content, anchor])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[85vw] max-w-125 data-[side=right]:sm:max-w-125 md:max-w-none md:w-125 flex flex-col overflow-hidden bg-blue-25 dark:bg-[oklch(0.2_0.03_267)]"
        showCloseButton={false}>
        <SheetHeader className="flex-row justify-between items-center px-4 py-2 bg-blue-50 border-b border-border dark:bg-[oklch(0.25_0.06_267)]">
          <div className="flex gap-2 items-center">
            <SheetTitle>{m.documentation()}</SheetTitle>
            <a href={docsUrl} target="_blank" rel="noopener noreferrer">
              <TbExternalLink className="size-4 text-muted-foreground hover:text-foreground" />
            </a>
          </div>
          <Button variant="ghost" className="hover:bg-transparent" size="sm-icon" onClick={() => onOpenChange(false)}>
            <TbX />
            <span className="sr-only">Close</span>
          </Button>
        </SheetHeader>
        {content && (
          <ScrollArea className="flex-1 h-0">
            <div ref={contentRef} className="px-4 pb-6 prose prose-sm dark:prose-invert max-w-none">
              {title && <h1>{title}</h1>}
              <Markdown
                remarkPlugins={[remarkGfm, remarkHeadingId, remarkDirective, remarkAdmonitions]}
                rehypePlugins={[rehypeRaw, rehypeSlug]}
                components={{
                  a: ({ href, children, ...props }) => (
                    <a href={rewriteHref(href)} target="_blank" rel="noopener noreferrer" {...props}>
                      {children}
                    </a>
                  ),
                  img: ({ src, alt, ...props }) => <img src={rewriteImgSrc(src)} alt={alt} {...props} />,
                  // Docs never use native `<video>`; this is the normalized `<Video id title />` MDX tag.
                  video: ({ id, title }) => (id ? <YouTubeFacade id={id} title={String(title ?? '')} /> : null),
                  div: ({ className, children, node: _node, ...props }) => {
                    const classes = typeof className === 'string' ? className.split(' ') : []
                    const type = classes.find((c) => c.startsWith('admonition-'))?.slice('admonition-'.length)
                    const admonition = type ? ADMONITIONS[type] : undefined
                    if (!classes.includes('admonition') || !admonition) {
                      return (
                        <div className={className} {...props}>
                          {children}
                        </div>
                      )
                    }
                    const { Icon, label } = admonition
                    return (
                      <div className={`admonition admonition-${type}`}>
                        <div className="admonition-heading">
                          <Icon className="admonition-icon" aria-hidden />
                          {label()}
                        </div>
                        <div className="admonition-content">{children}</div>
                      </div>
                    )
                  }
                }}>
                {content}
              </Markdown>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
