export const schoolSubjectNames = [
  "Mathématiques", "Français", "Anglais", "Informatique", "Histoire", "Géographie",
  "Éducation à la citoyenneté", "Éducation physique et sportive (EPS)", "Éducation artistique", "Langues nationales",
  "Sciences (PCT et SVTEEHB)", "Physique, Chimie et Technologie (PCT)",
  "Sciences de la Vie et de la Terre, Éducation à l’Environnement, Hygiène et Biotechnologie (SVTEEHB)",
  "Philosophie", "Littérature", "Langue vivante II", "Allemand", "Espagnol", "Arabe",
  "Latin", "Grec", "Langue vivante III", "Arts cinématographiques", "Physique", "Chimie",
  "Biologie", "Sciences de la Vie et de la Terre (SVT)", "Technologie de l’Information (TI)",
  "Éducation à la citoyenneté et à la morale", "Bilingue Français-Anglais", "Bilingue English-French",
] as const;

const core = ["Mathématiques", "Français", "Anglais", "Informatique", "Histoire", "Géographie", "Éducation à la citoyenneté", "Éducation physique et sportive (EPS)"];
const science = ["Physique, Chimie et Technologie (PCT)", "Sciences de la Vie et de la Terre, Éducation à l’Environnement, Hygiène et Biotechnologie (SVTEEHB)"];
const languages = ["Langue vivante II", "Allemand", "Espagnol", "Arabe", "Latin", "Grec", "Langue vivante III"];

export function getSchoolSubjectNames(levelName: string): string[] {
  const n = levelName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  if (/^(6e|6eme|5e|5eme)$/.test(n)) return [...core, "Éducation artistique", "Sciences (PCT et SVTEEHB)", "Langues nationales"];
  if (/^(4e|4eme|3e|3eme)$/.test(n)) return [...core, ...science, "Éducation artistique", "Allemand", "Espagnol"];
  const series = n.match(/(?:seconde|2nde|premiere|1ere|terminale|tle)\s*([a-z]+)/)?.[1] ?? "";
  if (series === "c") return [...core, "Philosophie", "Littérature", "Physique", "Chimie", "Sciences de la Vie et de la Terre (SVT)", "Technologie de l’Information (TI)"];
  if (series === "d") return [...core, "Philosophie", "Littérature", "Physique", "Chimie", "Biologie", "Sciences de la Vie et de la Terre (SVT)", "Technologie de l’Information (TI)"];
  if (series.startsWith("a")) return [...core, "Philosophie", "Littérature", ...languages, "Éducation à la citoyenneté et à la morale"];
  if (series === "ti") return [...core, "Philosophie", "Physique", "Chimie", "Technologie de l’Information (TI)"];
  if (series === "bil") return [...core, "Bilingue Français-Anglais", "Bilingue English-French", ...science];
  return [...core, "Philosophie", "Littérature", ...languages, ...science, "Physique", "Chimie", "Biologie", "Sciences de la Vie et de la Terre (SVT)", "Technologie de l’Information (TI)"];
}
