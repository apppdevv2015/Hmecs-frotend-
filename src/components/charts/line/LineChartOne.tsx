import Chart from "react-apexcharts";
import { chartService } from "../../../services/chartService";

export default function LineChartOne() {
  const { options, series } = chartService.getLineChartData();

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartEight" className="min-w-[1000px]">
        <Chart options={options} series={series} type="area" height={310} />
      </div>
    </div>
  );
}
