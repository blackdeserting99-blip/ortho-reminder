export type Patient = {
  id: number;
  name: string;
  phone: string;
  treatment: string;
  bracketType?: string;
  age?: number;
  appointmentDate: string;
};

export const patients: Patient[] = [
  {
    id: 1,
    name: "Ahmed Ali",
    phone: "0770000000",
    treatment: "Fixed Braces",
    appointmentDate: "2025-08-15",
  },
  {
    id: 2,
    name: "Sara Mohammed",
    phone: "0780000000",
    treatment: "Twin Block",
    appointmentDate: "2025-08-20",
  },
];