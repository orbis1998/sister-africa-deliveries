import { STATUS_COLOR, STATUS_LABEL, type DeliveryStatus } from "@/lib/deliveryTypes";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: DeliveryStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider",
        STATUS_COLOR[status],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {STATUS_LABEL[status]}
    </span>
  );
}
