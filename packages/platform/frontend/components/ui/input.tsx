import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
        "transition-all duration-200",
        "placeholder:text-muted-foreground",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "outline-none focus:outline-none focus-visible:outline-none",
        "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30",
        "dark:bg-input/30 dark:hover:bg-input/50",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
