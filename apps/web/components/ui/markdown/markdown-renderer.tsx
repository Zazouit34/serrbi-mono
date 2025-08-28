import { cn } from "@workspace/ui/lib/utils"
import { MDXRemote, MDXRemoteProps } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"

export const markdownClassNames =
  "max-w-none prose prose-neutral font-sans"

export function MarkdownRenderer({
  className,
  options,
  ...props
}: MDXRemoteProps & { className?: string }) {
  return (
    <div className={cn(markdownClassNames, className)}>
      <MDXRemote
        {...props}
        options={{
          mdxOptions: {
            remarkPlugins: [
              remarkGfm,
              ...(options?.mdxOptions?.remarkPlugins ?? []),
            ],
            ...options?.mdxOptions,
          },
        }}
      />
    </div>
  )
}