import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
  studentStatus: z.enum(["ELEVE", "ETUDIANT"]),
  schoolName: z.string().trim().min(2, "Renseigne ton établissement.").max(150),
  academicLevelName: z.string().trim().min(1, "Renseigne ton niveau."),
  programName: z.string().trim().min(1).optional().or(z.literal("")),
}).refine((v) => v.password === v.confirmPassword, {
  path: ["confirmPassword"],
  message: "Les mots de passe ne correspondent pas.",
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});
