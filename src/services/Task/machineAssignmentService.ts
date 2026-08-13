type MachineAssignment = {
  userId: string;
  role: "engineer" | "operator";
  machineIds: string[];
};

const dummyAssignments: MachineAssignment[] = [
  /* ENGINEERS */
  {
    userId: "eng_1",
    role: "engineer",
    machineIds: ["FLT-1001", "FLT-1002", "FLT-1003"],
  },

  {
    userId: "eng_2",
    role: "engineer",
    machineIds: ["FLT-1004", "FLT-1005"],
  },

  /* OPERATORS */
  {
    userId: "op_1",
    role: "operator",
    machineIds: ["FLT-1001"], // only 1 machine
  },

  {
    userId: "op_2",
    role: "operator",
    machineIds: ["FLT-1002"],
  },

  {
    userId: "op_3",
    role: "operator",
    machineIds: ["FLT-1003"],
  },
];

export const machineAssignmentService = {
  /* GET ASSIGNED MACHINES */
  async getAssignedMachines(userId: string): Promise<string[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const assignment = dummyAssignments.find((item) => item.userId === userId);

        resolve(assignment?.machineIds || []);
      }, 300);
    });
  },

  /* ASSIGN MACHINES */
  async assignMachines(
    userId: string,
    machineIds: string[],
    role: "engineer" | "operator" = "engineer",
  ): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const existingAssignment = dummyAssignments.find((item) => item.userId === userId);

        /* operator => only one machine */
        const finalMachineIds = role === "operator" ? machineIds.slice(0, 1) : machineIds;

        if (existingAssignment) {
          existingAssignment.machineIds = finalMachineIds;
        } else {
          dummyAssignments.push({
            userId,
            role,
            machineIds: finalMachineIds,
          });
        }

        resolve(true);
      }, 300);
    });
  },

  /* GET ALL ASSIGNMENTS */
  async getAllAssignments() {
    return new Promise<MachineAssignment[]>((resolve) => {
      setTimeout(() => {
        resolve(dummyAssignments);
      }, 300);
    });
  },
};
