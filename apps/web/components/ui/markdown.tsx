"use client"

import { cn } from "@workspace/ui/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export type MarkdownProps = {
  children: string
  className?: string
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Customize markdown rendering
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ inline, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-sm" {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code className="block rounded-lg bg-gray-100 dark:bg-gray-800 p-3 text-sm overflow-x-auto" {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
