import { z } from "zod";

const optionalUuid = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().uuid("Identifiant invalide.").optional()
);

export const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
  studentStatus: z.enum(["ELEVE", "ETUDIANT"]),
  schoolId: optionalUuid,
  academicLevelId: optionalUuid,
  programId: optionalUuid,
}).refine((v) => v.password === v.confirmPassword, {
  path: ["confirmPassword"],
  message: "Les mots de passe ne correspondent pas.",
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});
