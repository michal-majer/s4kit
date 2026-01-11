import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs",
        "transition-all duration-200",
        "placeholder:text-muted-foreground",
        "outline-none focus:outline-none focus-visible:outline-none",
        "focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30",
        "dark:bg-input/30 dark:hover:bg-input/50",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
        "aria-invalid:border-destructive",
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
