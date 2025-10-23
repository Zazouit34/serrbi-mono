// apps/web/components/ui/markdown/markdown-renderer.client.tsx
"use client"
import { cn } from "@workspace/ui/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"

export const markdownClassNames = "max-w-none prose prose-neutral font-sans"

export function MarkdownRendererClient({ className, source }: { className?: string; source: string }) {
  return (
    <div className={cn(markdownClassNames, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
        {source}
      </ReactMarkdown>
    </div>
  )
}