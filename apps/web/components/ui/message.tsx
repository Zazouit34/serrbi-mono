"use client"

import { cn } from "@workspace/ui/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"

export type MessageProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

export type MessageAvatarProps = {
  src?: string
  alt?: string
  fallback?: string
  className?: string
}

export type MessageContentProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

export function Message({ children, className, ...props }: MessageProps) {
  return (
    <div className={cn("flex items-start gap-3", className)} {...props}>
      {children}
    </div>
  )
}

export function MessageAvatar({ src, alt, fallback, className }: MessageAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {src && <AvatarImage src={src} alt={alt} />}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  )
}

export function MessageContent({ children, className, ...props }: MessageContentProps) {
  return (
    <div
      className={cn(
        "inline-block w-fit max-w-full whitespace-pre-wrap break-words rounded-lg px-4 py-2.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
