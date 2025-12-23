import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card/50 p-16 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-accent/15 ring-1 ring-accent/20">
          <Icon className="h-10 w-10 text-accent" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      {description && (
        <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {children && <div className="mt-10">{children}</div>}
    </div>
  );
}
