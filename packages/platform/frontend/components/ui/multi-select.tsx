"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyMessage = "No items found",
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    const lower = search.toLowerCase()
    return options.filter(opt => 
      opt.label.toLowerCase().includes(lower) ||
      opt.value.toLowerCase().includes(lower)
    )
  }, [options, search])

  const selectedOptions = React.useMemo(() => {
    return options.filter(opt => selected.includes(opt.value))
  }, [options, selected])

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onSelectionChange(selected.filter(v => v !== value))
    } else {
      onSelectionChange([...selected, value])
    }
  }

  const removeOption = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectionChange(selected.filter(v => v !== value))
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "w-full justify-between min-h-9 h-auto py-2",
          !selected.length && "text-muted-foreground",
          className
        )}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-wrap gap-1 flex-1 text-left">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map(opt => (
              <Badge
                key={opt.value}
                variant="secondary"
                className="mr-1 mb-1"
              >
                {opt.label}
                <button
                  type="button"
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      removeOption(opt.value, e as any)
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={(e) => removeOption(opt.value, e)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <ChevronDownIcon className={cn(
          "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
          open && "transform rotate-180"
        )} />
      </Button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md">
          <div className="p-2">
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false)
                }
              }}
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-[300px]">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => {
                  const isSelected = selected.includes(option.value)
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        isSelected && "bg-accent"
                      )}
                      onClick={() => toggleOption(option.value)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected && "bg-primary text-primary-foreground"
                          )}
                        >
                          {isSelected && (
                            <CheckIcon className="h-3 w-3" />
                          )}
                        </div>
                        <span className="flex-1">{option.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
          {selected.length > 0 && (
            <div className="p-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => {
                  onSelectionChange([])
                  setSearch("")
                }}
              >
                Clear all ({selected.length})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
