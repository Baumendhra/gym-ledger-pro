import { cn } from "@/lib/utils";

export function StatusBadge({
  finalStatus,
}: {
  finalStatus: "Active" | "At Risk" | "Inactive" | "New";
}) {
  const config =
    finalStatus === "Active"
      ? { label: "Active",   className: "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400" }
      : finalStatus === "At Risk"
      ? { label: "At Risk",  className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" }
      : finalStatus === "Inactive"
      ? { label: "Inactive", className: "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400" }
      : { label: "New",      className: "bg-gray-100   text-gray-700   dark:bg-gray-800      dark:text-gray-300" };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider whitespace-nowrap",
        config.className
      )}
    >
      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
