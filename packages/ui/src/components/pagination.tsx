import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button, buttonVariants } from "@workspace/ui/components/button"

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
  React.ComponentProps<"a">

  function PaginationLink({
    className,
    isActive,
    size = "icon",
    ...props
  }: PaginationLinkProps) {
    return (
      <a
        aria-current={isActive ? "page" : undefined}
        data-slot="pagination-link"
        data-active={isActive}
        className={cn(
          // Base button style for pagination
          "flex items-center justify-center w-9 h-9 rounded-lg border text-sm font-medium transition-colors",
          "hover:bg-muted hover:text-foreground",
          isActive
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-transparent text-foreground border-border",
          className
        )}
        {...props}
      />
    )
  }
  

  function PaginationPrevious({
    className,
    ...props
  }: React.ComponentProps<typeof PaginationLink>) {
    return (
      <PaginationLink
        aria-label="Go to previous page"
        className={cn("w-9 h-9 rounded-lg border hover:bg-muted", className)}
        {...props}
      >
        <ChevronLeftIcon className="size-4" />
      </PaginationLink>
    )
  }
  
  function PaginationNext({
    className,
    ...props
  }: React.ComponentProps<typeof PaginationLink>) {
    return (
      <PaginationLink
        aria-label="Go to next page"
        className={cn("w-9 h-9 rounded-lg border hover:bg-muted", className)}
        {...props}
      >
        <ChevronRightIcon className="size-4" />
      </PaginationLink>
    )
  }
  

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-9 items-center justify-center", className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">More pages</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
