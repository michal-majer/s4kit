import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1.5 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden uppercase tracking-wide",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive/90 text-white shadow-sm [a&]:hover:bg-destructive",
        outline:
          "border-border text-foreground bg-background [a&]:hover:bg-accent/50 [a&]:hover:text-accent-foreground",
        success:
          "border-transparent bg-success text-success-foreground shadow-sm [a&]:hover:bg-success/90",
        warning:
          "border-transparent bg-warning text-warning-foreground shadow-sm [a&]:hover:bg-warning/90",
        accent:
          "border-transparent bg-accent text-accent-foreground shadow-sm [a&]:hover:bg-accent/90",
        ghost:
          "border-transparent bg-muted text-muted-foreground [a&]:hover:bg-muted/80",
        // SAP TechEd "GA now" style - bright cyan/teal
        ga: "border-transparent bg-[oklch(0.78_0.2_185)] text-[oklch(0.15_0.06_185)] shadow-md shadow-[oklch(0.78_0.2_185)]/25 font-extrabold",
        // Pastel variants matching stats cards
        lavender:
          "border-transparent bg-[oklch(0.85_0.1_290)] text-[oklch(0.25_0.12_290)] dark:bg-[oklch(0.4_0.12_290)] dark:text-white",
        mint:
          "border-transparent bg-[oklch(0.85_0.12_175)] text-[oklch(0.2_0.1_175)] dark:bg-[oklch(0.4_0.14_175)] dark:text-white",
        purple:
          "border-transparent bg-[oklch(0.82_0.14_280)] text-[oklch(0.22_0.12_280)] dark:bg-[oklch(0.38_0.14_280)] dark:text-white",
        pink:
          "border-transparent bg-[oklch(0.85_0.12_340)] text-[oklch(0.25_0.12_340)] dark:bg-[oklch(0.4_0.14_340)] dark:text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
