import '@mdxeditor/editor/style.css'
import { useEffect, useRef, useState } from 'react'
import {
  MDXEditor,
  type MDXEditorMethods,
  headingsPlugin,
  markdownShortcutPlugin,
  listsPlugin,
  quotePlugin,
  linkPlugin,
  linkDialogPlugin,
  diffSourcePlugin,
  toolbarPlugin,
  DiffSourceToggleWrapper,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  ListsToggle,
  UndoRedo
} from '@mdxeditor/editor'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button
} from '@patchdocs/ui'
import { TbInfoCircle } from 'react-icons/tb'
import * as m from '@/paraglide/messages'

// Map MDXEditor translation keys to Paraglide messages
const mdxTranslations: Record<string, (params?: Record<string, string | number>) => string> = {
  'toolbar.blockTypes.paragraph': () => m.mdx_toolbar_blockTypes_paragraph(),
  'toolbar.blockTypes.quote': () => m.mdx_toolbar_blockTypes_quote(),
  'toolbar.blockTypes.heading': (p) => m.mdx_toolbar_blockTypes_heading({ level: String(p?.level ?? '') }),
  'toolbar.blockTypeSelect.selectBlockTypeTooltip': () => m.mdx_toolbar_blockTypeSelect_selectBlockTypeTooltip(),
  'toolbar.blockTypeSelect.placeholder': () => m.mdx_toolbar_blockTypeSelect_placeholder(),
  'toolbar.toggleGroup': () => m.mdx_toolbar_toggleGroup(),
  'toolbar.removeBold': () => m.mdx_toolbar_removeBold(),
  'toolbar.bold': () => m.mdx_toolbar_bold(),
  'toolbar.removeItalic': () => m.mdx_toolbar_removeItalic(),
  'toolbar.italic': () => m.mdx_toolbar_italic(),
  'toolbar.underline': () => m.mdx_toolbar_underline(),
  'toolbar.removeUnderline': () => m.mdx_toolbar_removeUnderline(),
  'toolbar.removeInlineCode': () => m.mdx_toolbar_removeInlineCode(),
  'toolbar.inlineCode': () => m.mdx_toolbar_inlineCode(),
  'toolbar.link': () => m.mdx_toolbar_link(),
  'toolbar.richText': () => m.mdx_toolbar_richText(),
  'toolbar.diffMode': () => m.mdx_toolbar_diffMode(),
  'toolbar.source': () => m.mdx_toolbar_source(),
  'toolbar.admonition': () => m.mdx_toolbar_admonition(),
  'toolbar.codeBlock': () => m.mdx_toolbar_codeBlock(),
  'toolbar.editFrontmatter': () => m.mdx_toolbar_editFrontmatter(),
  'toolbar.insertFrontmatter': () => m.mdx_toolbar_insertFrontmatter(),
  'toolbar.image': () => m.mdx_toolbar_image(),
  'toolbar.table': () => m.mdx_toolbar_table(),
  'toolbar.thematicBreak': () => m.mdx_toolbar_thematicBreak(),
  'toolbar.bulletedList': () => m.mdx_toolbar_bulletedList(),
  'toolbar.numberedList': () => m.mdx_toolbar_numberedList(),
  'toolbar.checkList': () => m.mdx_toolbar_checkList(),
  'toolbar.undo': (p) => m.mdx_toolbar_undo({ shortcut: String(p?.shortcut ?? '') }),
  'toolbar.redo': (p) => m.mdx_toolbar_redo({ shortcut: String(p?.shortcut ?? '') }),
  'dialogControls.save': () => m.mdx_dialogControls_save(),
  'dialogControls.cancel': () => m.mdx_dialogControls_cancel(),
  'createLink.url': () => m.mdx_createLink_url(),
  'createLink.urlPlaceholder': () => m.mdx_createLink_urlPlaceholder(),
  'createLink.text': () => m.mdx_createLink_text(),
  'createLink.textTooltip': () => m.mdx_createLink_textTooltip(),
  'createLink.title': () => m.mdx_createLink_title(),
  'createLink.titleTooltip': () => m.mdx_createLink_titleTooltip(),
  'createLink.saveTooltip': () => m.mdx_createLink_saveTooltip(),
  'createLink.cancelTooltip': () => m.mdx_createLink_cancelTooltip(),
  'linkPreview.open': (p) => m.mdx_linkPreview_open({ url: String(p?.url ?? '') }),
  'linkPreview.edit': () => m.mdx_linkPreview_edit(),
  'linkPreview.copyToClipboard': () => m.mdx_linkPreview_copyToClipboard(),
  'linkPreview.copied': () => m.mdx_linkPreview_copied(),
  'linkPreview.remove': () => m.mdx_linkPreview_remove(),
  'contentArea.editableMarkdown': () => m.mdx_contentArea_editableMarkdown()
}

const translate = (key: string, defaultValue: string, interpolations?: Record<string, string | number>) => {
  const fn = mdxTranslations[key]
  return fn ? fn(interpolations) : defaultValue
}

interface NoteEditorDialogMdxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialContent: string
  onSave: (content: string) => void
  canEdit: boolean
  resourceName: string
}

const NoteEditorDialogMdx = ({
  open,
  onOpenChange,
  initialContent,
  onSave,
  canEdit,
  resourceName
}: NoteEditorDialogMdxProps) => {
  const editorRef = useRef<MDXEditorMethods>(null)
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const handleSave = () => {
    if (editorRef.current) {
      onSave(editorRef.current.getMarkdown())
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden flex flex-col max-h-[80svh] sm:max-w-175"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          if (canEdit) editorRef.current?.focus()
          else (e.currentTarget as HTMLElement).focus()
        }}>
        <DialogHeader>
          <DialogTitle>{m.notes_for({ resource: resourceName })}</DialogTitle>
          <DialogDescription className="sr-only">Edit notes for this resource</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto border border-border rounded-md">
          <MDXEditor
            ref={editorRef}
            markdown={initialContent}
            readOnly={!canEdit}
            className={isDark ? 'dark-theme' : ''}
            translation={translate}
            plugins={[
              headingsPlugin(),
              listsPlugin(),
              quotePlugin(),
              linkPlugin(),
              linkDialogPlugin(),
              markdownShortcutPlugin(),
              diffSourcePlugin(),
              toolbarPlugin({
                toolbarContents: () => (
                  <DiffSourceToggleWrapper options={['rich-text', 'source']}>
                    <UndoRedo />
                    <BlockTypeSelect />
                    <BoldItalicUnderlineToggles />
                    <CodeToggle />
                    <ListsToggle />
                  </DiffSourceToggleWrapper>
                )
              })
            ]}
          />
        </div>

        <p className="flex items-center gap-1.5 text-xs text-amber-600">
          <TbInfoCircle className="size-4 shrink-0" />
          {m.sensitive_data_hint()}
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {canEdit ? m.cancel() : m.close()}
          </Button>
          {canEdit && (
            <Button type="button" onClick={handleSave}>
              {m.save()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NoteEditorDialogMdx
