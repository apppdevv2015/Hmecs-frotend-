import { ApexOptions } from "apexcharts";

export interface ChartSeries {
  name: string;
  data: number[];
}

export interface ChartData {
  options: ApexOptions;
  series: ChartSeries[];
}

export const chartService = {
  getBarChartData(): ChartData {
    return {
      options: {
        colors: ["#465fff"],
        chart: {
          fontFamily: "Outfit, sans-serif",
          type: "bar",
          height: 180,
          toolbar: {
            show: false,
          },
        },
        plotOptions: {
          bar: {
            horizontal: false,
            columnWidth: "39%",
            borderRadius: 5,
            borderRadiusApplication: "end",
          },
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          show: true,
          width: 4,
          colors: ["transparent"],
        },
        xaxis: {
          categories: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ],
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
        },
        legend: {
          show: true,
          position: "top",
          horizontalAlign: "left",
          fontFamily: "Outfit",
        },
        yaxis: {
          title: {
            text: undefined,
          },
        },
        grid: {
          yaxis: {
            lines: {
              show: true,
            },
          },
        },
        fill: {
          opacity: 1,
        },
        tooltip: {
          x: {
            show: false,
          },
          y: {
            formatter: (val: number) => `${val}`,
          },
        },
      },
      series: [
        {
          name: "Sales",
          data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112],
        },
      ],
    };
  },

  getLineChartData(): ChartData {
    return {
      options: {
        legend: {
          show: false,
          position: "top",
          horizontalAlign: "left",
        },
        colors: ["#465FFF", "#9CB9FF"],
        chart: {
          fontFamily: "Outfit, sans-serif",
          height: 310,
          type: "line",
          toolbar: {
            show: false,
          },
        },
        stroke: {
          curve: "straight",
          width: [2, 2],
        },
        fill: {
          type: "gradient",
          gradient: {
            opacityFrom: 0.55,
            opacityTo: 0,
          },
        },
        markers: {
          size: 0,
          strokeColors: "#fff",
          strokeWidth: 2,
          hover: {
            size: 6,
          },
        },
        grid: {
          xaxis: {
            lines: {
              show: false,
            },
          },
          yaxis: {
            lines: {
              show: true,
            },
          },
        },
        dataLabels: {
          enabled: false,
        },
        tooltip: {
          enabled: true,
          x: {
            format: "dd MMM yyyy",
          },
        },
        xaxis: {
          type: "category",
          categories: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ],
          axisBorder: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
          tooltip: {
            enabled: false,
          },
        },
        yaxis: {
          labels: {
            style: {
              fontSize: "12px",
              colors: ["#6B7280"],
            },
          },
          title: {
            text: "",
            style: {
              fontSize: "0px",
            },
          },
        },
      },
      series: [
        {
          name: "Sales",
          data: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
        },
        {
          name: "Revenue",
          data: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
        },
      ],
    };
  },
};
