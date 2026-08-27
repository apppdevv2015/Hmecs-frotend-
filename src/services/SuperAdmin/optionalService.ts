export type OptionalServiceStatus = "ACTIVE" | "INACTIVE";

export interface OptionalService {
  id: number;
  name: string;
  description: string;
  status: OptionalServiceStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OptionalServicePayload {
  name: string;
  description: string;
  status: OptionalServiceStatus;
  displayOrder: number;
}

// ----------------------------------------------------
// Dummy Data
// ----------------------------------------------------

let optionalServices: OptionalService[] = [
  {
    id: 1,
    name: "Telematics / ECU Integration",
    description:
      "Integration with vehicle telematics and ECU systems for real-time vehicle data.",
    status: "ACTIVE",
    displayOrder: 1,
    createdAt: "26 Aug 2026",
    updatedAt: "26 Aug 2026",
  },
  {
    id: 2,
    name: "Historical Data Migration & Cleaning",
    description:
      "Migration, transformation and cleaning of existing historical data.",
    status: "ACTIVE",
    displayOrder: 2,
    createdAt: "26 Aug 2026",
    updatedAt: "26 Aug 2026",
  },
  {
    id: 3,
    name: "Custom API Development",
    description:
      "Custom API development and integration with external business systems.",
    status: "ACTIVE",
    displayOrder: 3,
    createdAt: "25 Aug 2026",
    updatedAt: "25 Aug 2026",
  },
  {
    id: 4,
    name: "SAP / ERP Integration",
    description:
      "Integration with SAP and other ERP systems for seamless data exchange.",
    status: "ACTIVE",
    displayOrder: 4,
    createdAt: "25 Aug 2026",
    updatedAt: "25 Aug 2026",
  },
  {
    id: 5,
    name: "Additional Training",
    description:
      "Additional technical and user training sessions for customer teams.",
    status: "ACTIVE",
    displayOrder: 5,
    createdAt: "24 Aug 2026",
    updatedAt: "24 Aug 2026",
  },
  {
    id: 6,
    name: "SMS / WhatsApp Notifications",
    description:
      "SMS and WhatsApp based notifications for alerts and important updates.",
    status: "ACTIVE",
    displayOrder: 6,
    createdAt: "24 Aug 2026",
    updatedAt: "24 Aug 2026",
  },
  {
    id: 7,
    name: "Custom Reports",
    description:
      "Customized reports and dashboards based on customer requirements.",
    status: "ACTIVE",
    displayOrder: 7,
    createdAt: "23 Aug 2026",
    updatedAt: "23 Aug 2026",
  },
  {
    id: 8,
    name: "On-site Technical Support",
    description:
      "On-site technical assistance and implementation support.",
    status: "INACTIVE",
    displayOrder: 8,
    createdAt: "23 Aug 2026",
    updatedAt: "23 Aug 2026",
  },
];

// ----------------------------------------------------
// GET ALL
// ----------------------------------------------------

export const getOptionalServices = async (): Promise<
  OptionalService[]
> => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  return [...optionalServices].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
};

// ----------------------------------------------------
// GET BY ID
// ----------------------------------------------------

export const getOptionalServiceById = async (
  id: number
): Promise<OptionalService | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return (
    optionalServices.find((service) => service.id === id) ||
    null
  );
};

// ----------------------------------------------------
// CREATE
// ----------------------------------------------------

export const createOptionalService = async (
  payload: OptionalServicePayload
): Promise<OptionalService> => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const now = new Date();

  const newService: OptionalService = {
    id: Date.now(),
    name: payload.name.trim(),
    description: payload.description.trim(),
    status: payload.status,
    displayOrder: payload.displayOrder,
    createdAt: now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    updatedAt: now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };

  optionalServices = [...optionalServices, newService];

  return newService;
};

// ----------------------------------------------------
// UPDATE
// ----------------------------------------------------

export const updateOptionalService = async (
  id: number,
  payload: OptionalServicePayload
): Promise<OptionalService> => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const index = optionalServices.findIndex(
    (service) => service.id === id
  );

  if (index === -1) {
    throw new Error("Optional service not found.");
  }

  const updatedService: OptionalService = {
    ...optionalServices[index],
    name: payload.name.trim(),
    description: payload.description.trim(),
    status: payload.status,
    displayOrder: payload.displayOrder,
    updatedAt: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };

  optionalServices[index] = updatedService;

  return updatedService;
};

// ----------------------------------------------------
// TOGGLE STATUS
// ----------------------------------------------------

export const toggleOptionalServiceStatus = async (
  id: number
): Promise<OptionalService> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const index = optionalServices.findIndex(
    (service) => service.id === id
  );

  if (index === -1) {
    throw new Error("Optional service not found.");
  }

  const currentService = optionalServices[index];

  const updatedService: OptionalService = {
    ...currentService,
    status:
      currentService.status === "ACTIVE"
        ? "INACTIVE"
        : "ACTIVE",
    updatedAt: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
  };

  optionalServices[index] = updatedService;

  return updatedService;
};

// ----------------------------------------------------
// DELETE
// ----------------------------------------------------

export const deleteOptionalService = async (
  id: number
): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const exists = optionalServices.some(
    (service) => service.id === id
  );

  if (!exists) {
    throw new Error("Optional service not found.");
  }

  optionalServices = optionalServices.filter(
    (service) => service.id !== id
  );
};