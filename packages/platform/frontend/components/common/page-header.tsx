import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  badge?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
  badge,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {badge && (
            <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground shadow-md shadow-accent/25">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="mt-3 flex flex-shrink-0 items-center gap-2.5 sm:mt-0">
          {children}
        </div>
      )}
    </div>
  );
}
