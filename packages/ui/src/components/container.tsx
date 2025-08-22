import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

type ContainerProps = React.HTMLAttributes<HTMLDivElement>

export function Container({ className, ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-full px-4 md:px-6 lg:px-8",
        className
      )}
      {...props}
    />
  )
}


