import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "transition-colors duration-200",
        "placeholder:text-muted-foreground/60",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "outline-none focus:outline-none focus-visible:outline-none",
        "focus:border-foreground/30 focus-visible:border-foreground/30",
        "ring-0 focus:ring-0 focus-visible:ring-0",
        "hover:border-muted-foreground/40",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
