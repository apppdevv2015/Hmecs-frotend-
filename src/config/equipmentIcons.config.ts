import * as LucideIcons from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface EquipmentIconOption {
  key: string;
  label: string;
  category: "Haulage" | "Digging" | "Drilling" | "Earthmoving" | "Mechanical" | "Processing" | "Lifting" | "Support & Utility" | "General";
}

// Complete Heavy Mining & Construction Equipment Icons Catalog
export const EQUIPMENT_ICON_CATALOG: EquipmentIconOption[] = [
  // Haulage & Transport
  { key: "Truck", label: "Haul Truck 400T / Dump Truck", category: "Haulage" },
  { key: "Container", label: "Articulated Dump Truck", category: "Haulage" },
  { key: "Tractor", label: "Tractor / Towing Vehicle", category: "Haulage" },
  { key: "Gauge", label: "Heavy Transport Unit", category: "Haulage" },

  // Earthmoving & Grading
  { key: "HardHat", label: "Crawler Mining Dozer", category: "Earthmoving" },
  { key: "Construction", label: "Motor Grader (Road Maintenance)", category: "Earthmoving" },
  { key: "Box", label: "Front-End Wheel Loader", category: "Earthmoving" },
  { key: "Disc", label: "Road Compactor / Smooth Drum Roller", category: "Earthmoving" },

  // Digging & Excavation
  { key: "Pickaxe", label: "Hydraulic Excavator 600T", category: "Digging" },
  { key: "Zap", label: "Electric Cable Shovel", category: "Digging" },
  { key: "Shield", label: "Dragline Excavator", category: "Digging" },

  // Drilling & Blasting
  { key: "Activity", label: "Rotary Blast Hole Drill Rig", category: "Drilling" },
  { key: "Crosshair", label: "Precision Production Drill", category: "Drilling" },
  { key: "Flame", label: "Blasting & Explosive Unit", category: "Drilling" },

  // Support, Water & Fuel Utility
  { key: "Droplets", label: "Water Truck (Dust Suppression)", category: "Support & Utility" },
  { key: "Fuel", label: "Fuel & Lube Service Truck", category: "Support & Utility" },
  { key: "Wrench", label: "Mobile Workshop & Service Rig", category: "Support & Utility" },

  // Mechanical Breakers & Attachments
  { key: "Hammer", label: "Hydraulic Breaker / Rock Hammer", category: "Mechanical" },

  // Processing & Material Handling
  { key: "Layers", label: "Primary Crusher & Screening Plant", category: "Processing" },
  { key: "Sliders", label: "Conveyor Belt & Feeder System", category: "Processing" },
  { key: "Cpu", label: "Autonomous Fleet System", category: "Processing" },

  // Lifting & Hoisting
  { key: "Anchor", label: "Mining Crane / Cable Hoist", category: "Lifting" },
];

/**
 * Dynamically resolves any Lucide Icon component by string name.
 * Falls back to Truck icon if icon key is not found in registry.
 */
export const getEquipmentIconComponent = (iconName: string): LucideIcon => {
  if (!iconName) return LucideIcons.Truck;
  const Component = (LucideIcons as any)[iconName];
  if (Component && (typeof Component === "function" || typeof Component === "object")) {
    return Component as LucideIcon;
  }
  return LucideIcons.Truck;
};

/**
 * Filter equipment icons dynamically by search query
 */
export const searchEquipmentIcons = (query: string): EquipmentIconOption[] => {
  if (!query.trim()) return EQUIPMENT_ICON_CATALOG;
  const q = query.toLowerCase().trim();
  return EQUIPMENT_ICON_CATALOG.filter(
    (item) =>
      item.key.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );
};
