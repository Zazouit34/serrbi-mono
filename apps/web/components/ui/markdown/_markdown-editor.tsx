"use client"


import { cn } from "@workspace/ui/lib/utils"
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  headingsPlugin,
  InsertTable,
  InsertThematicBreak,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  MDXEditorMethods,
  MDXEditorProps,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor"
import { Ref } from "react"
import { markdownClassNames } from "./markdown-renderer"

export default function InternalMarkdownEditor({
  ref,
  className,
  ...props
}: MDXEditorProps & { ref?: Ref<MDXEditorMethods> }) {
  

  return (
    <MDXEditor
      {...props}
      ref={ref}
      className={cn(markdownClassNames, className)}
      suppressHtmlProcessing
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <BlockTypeSelect />
              <BoldItalicUnderlineToggles />
              <ListsToggle />
              <InsertThematicBreak />
            </>
          ),
        }),
      ]}
    />
  )
}