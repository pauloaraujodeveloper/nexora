import { useEffect, useRef } from "react";
import type { ChartConfiguration, ChartType } from "chart.js";
import { Chart } from "@/lib/chart";
import { cx } from "@/utils/cx";

type ChartCanvasProps<T extends ChartType> = {
  type: T;
  data: ChartConfiguration<T>["data"];
  options?: ChartConfiguration<T>["options"];
  height?: number;
  ariaLabel: string;
  className?: string;
};

/**
 * Thin React wrapper around Chart.js. Chart.js owns the canvas, so the chart
 * instance is created once and only its data/options are swapped afterwards.
 */
export function ChartCanvas<T extends ChartType>({
  type,
  data,
  options,
  height = 260,
  ariaLabel,
  className,
}: ChartCanvasProps<T>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const initial = useRef({ type, data, options });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const chart = new Chart(canvas, {
      type: initial.current.type,
      data: initial.current.data,
      options: initial.current.options,
    } as ChartConfiguration);
    chartRef.current = chart;
    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data = data as ChartConfiguration["data"];
    if (options) chart.options = options as NonNullable<ChartConfiguration["options"]>;
    chart.update("none");
  }, [data, options]);

  return (
    <div className={cx("nx-chart", className)} style={{ height }} role="img" aria-label={ariaLabel}>
      <canvas ref={canvasRef} />
    </div>
  );
}
