import Chart from "react-apexcharts";
import { chartService } from "../../../services/chartService";

export default function BarChartOne() {
  const { options, series } = chartService.getBarChartData();

  return (
    <div className="max-w-full overflow-x-auto custom-scrollbar">
      <div id="chartOne" className="min-w-[1000px]">
        <Chart options={options} series={series} type="bar" height={180} />
      </div>
    </div>
  );
}
