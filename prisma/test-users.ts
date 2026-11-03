import type { UserRole } from "../app/generated/prisma/client";

export type TestUserSeed = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  /** Kuliyapitiya BOQ numbers of the locations this login reports on. */
  boqNumbers?: number[];
};

// One shared test password (8+ characters, the sign-up minimum). Never use these accounts in production.
const password = "Clean@2026";

const unit = (email: string, name: string, boqNumber: number): TestUserSeed => ({
  email: `${email}@university.edu`,
  password,
  name,
  role: "UNIT_OFFICER",
  boqNumbers: [boqNumber],
});

export const testUsers: TestUserSeed[] = [
  { email: "dr@university.edu", password, name: "Deputy Registrar", role: "DEPUTY_REGISTRAR" },

  // PHI: Main Administration Building + the external services.
  { email: "phi@university.edu", password, name: "Public Health Inspector", role: "PHI", boqNumbers: [4, 26, 27, 28] },

  // Faculty logins (faculty-wise filtering).
  { email: "fbsf@university.edu", password, name: "FBSF Coordinator", role: "FACULTY_COORDINATOR", boqNumbers: [1] },
  { email: "fas@university.edu", password, name: "FAS Coordinator", role: "FACULTY_COORDINATOR", boqNumbers: [2] },
  { email: "fot@university.edu", password, name: "FOT Coordinator", role: "FACULTY_COORDINATOR", boqNumbers: [3] },
  { email: "elt@university.edu", password, name: "ELT Coordinator", role: "FACULTY_COORDINATOR", boqNumbers: [16] },

  // Four sub-wardens sharing the 8 halls.
  { email: "subwarden1@university.edu", password, name: "Sub-Warden 1 (Swarnapali, Pandukabhaya)", role: "SUB_WARDEN", boqNumbers: [7, 8] },
  { email: "subwarden2@university.edu", password, name: "Sub-Warden 2 (Paduwasdew, Chitradevi)", role: "SUB_WARDEN", boqNumbers: [9, 10] },
  { email: "subwarden3@university.edu", password, name: "Sub-Warden 3 (Anuladevi, Vijitha Kuruwita)", role: "SUB_WARDEN", boqNumbers: [11, 12] },
  { email: "subwarden4@university.edu", password, name: "Sub-Warden 4 (Vishaka, Seetha Deevi)", role: "SUB_WARDEN", boqNumbers: [13, 14] },

  // Curator: land, roads & landscape.
  { email: "curator@university.edu", password, name: "Curator", role: "CURATOR", boqNumbers: [17] },

  // One unit login per remaining location.
  unit("auditorium", "Auditorium Unit", 5),
  unit("gym", "Gymnasium Unit", 6),
  unit("staffquarters", "Staff Quarters Unit", 15),
  unit("oldvclodge", "Old VC Lodge Unit", 18),
  unit("canteens", "Canteens & Student Center Unit", 19),
  unit("medical", "Medical Centre Unit", 20),
  unit("newvclodge", "New VC Lodge Unit", 21),
  unit("facility", "Facility Center Unit", 22),
  unit("daycare", "Daycare Center Unit", 23),
  unit("library", "Library Unit", 24),
  unit("businesscenter", "Business Center Unit", 25),
];
