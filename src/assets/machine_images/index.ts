import dumpTruckImg from "../images/dump_truck_icon.png";
import excavatorImg from "../images/excavator_icon.png";
import dozerImg from "../images/dozer_icon.png";
import loaderImg from "../images/wheel_loader_icon.png";

export const defaultMachineImages = {
  haulTruck: dumpTruckImg,
  excavator: excavatorImg,
  dozer: dozerImg,
  loader: loaderImg,
  default: dumpTruckImg,
};

export const getPresetMachineImage = (equipmentType?: string, model?: string) => {
  const text = `${equipmentType || ""} ${model || ""}`.toLowerCase();
  if (text.includes("truck") || text.includes("dump") || text.includes("haul")) {
    return dumpTruckImg;
  }
  if (text.includes("excavator") || text.includes("jcb") || text.includes("dig") || text.includes("hydraulic")) {
    return excavatorImg;
  }
  if (text.includes("dozer") || text.includes("bulldozer") || text.includes("tractor")) {
    return dozerImg;
  }
  if (text.includes("loader") || text.includes("grader")) {
    return loaderImg;
  }
  return dumpTruckImg;
};
