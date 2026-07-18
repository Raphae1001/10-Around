import { CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  type: "date" | "time";
  value: string;
  onChange: (value: string) => void;
  label: string;
  /** Shown when empty so iOS blank date inputs stay readable. */
  emptyHint: string;
  min?: string;
  max?: string;
  className?: string;
};

/**
 * Full-width date/time field. Never place two native date inputs side-by-side
 * on iPhone — iOS controls overflow and make the whole app pannable.
 */
export function DateTimeField({
  type,
  value,
  onChange,
  label,
  emptyHint,
  min,
  max,
  className,
}: Props) {
  const Icon = type === "date" ? CalendarDays : Clock;
  const empty = !value;

  return (
    <div className={cn("w-full min-w-0", className)}>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">
        {label}
      </label>
      <div className="relative mt-1 w-full">
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-accent"
          aria-hidden
        />
        {empty && (
          <span className="pointer-events-none absolute inset-y-0 left-9 right-3 z-[1] flex items-center text-[15px] text-muted-foreground truncate">
            {emptyHint}
          </span>
        )}
        <input
          type={type}
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "box-border w-full max-w-full min-w-0 rounded-2xl border border-border bg-surface py-3.5 pl-9 pr-3 text-base outline-none focus:border-accent appearance-none",
            empty && "text-transparent [&::-webkit-datetime-edit]:text-transparent",
          )}
        />
      </div>
    </div>
  );
}
