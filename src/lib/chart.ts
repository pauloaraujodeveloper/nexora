import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from "chart.js";

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
);

Chart.defaults.font.family = "Inter, ui-sans-serif, system-ui, sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.color = "#8fa1c7";
Chart.defaults.borderColor = "rgba(126, 148, 196, 0.12)";
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = "rgba(8, 13, 24, 0.96)";
Chart.defaults.plugins.tooltip.borderColor = "rgba(126, 148, 196, 0.24)";
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.titleColor = "#e8eeff";
Chart.defaults.plugins.tooltip.bodyColor = "#9fb0d6";
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 10;
Chart.defaults.plugins.tooltip.displayColors = true;
Chart.defaults.plugins.tooltip.boxPadding = 4;
Chart.defaults.plugins.tooltip.usePointStyle = true;

export const chartPalette = {
  cyan: "#22d3ee",
  violet: "#8b8cff",
  magenta: "#e040fb",
  green: "#34d399",
  amber: "#fbbf24",
  rose: "#fb7185",
  slate: "#6f82a8",
  blue: "#60a5fa",
};

/** Soft vertical fill used by the area charts. */
export function areaGradient(context: CanvasRenderingContext2D, color: string, height = 260) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `${color}55`);
  gradient.addColorStop(1, `${color}00`);
  return gradient;
}

export { Chart };
