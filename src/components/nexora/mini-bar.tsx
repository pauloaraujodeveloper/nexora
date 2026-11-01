/** Slim progress bar used by compact list rows. */
export function MiniBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-tertiary-default">
      <div
        className="h-full rounded-full bg-chart-9 transition-[width] duration-700 motion-reduce:transition-none"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
