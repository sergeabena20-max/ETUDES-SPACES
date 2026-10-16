/** Libellés canoniques des classes. Les noms historiques restent inchangés en base. */
export function formatAcademicLevelName(name: string | null | undefined): string {
  if (!name) return "";
  const value = name.trim().replace(/\s+/g, " ");
  const compact = value.toUpperCase().replace(/[ ._-]+/g, "");
  const aliases: Record<string, string> = {
    PA: "1ère A", PC: "1ère C", PD: "1ère D",
    TA: "Tle A", TC: "Tle C", TD: "Tle D",
    "2NDEA": "2nde A", "2NDEC": "2nde C", "2NDED": "2nde D",
    "1EREA": "1ère A", "1EREC": "1ère C", "1ERED": "1ère D",
    "1ÈREA": "1ère A", "1ÈREC": "1ère C", "1ÈRED": "1ère D",
    TERMINALEA: "Tle A", TERMINALEC: "Tle C", TERMINALED: "Tle D",
    SECONDEA: "2nde A", SECONDEC: "2nde C", SECONDED: "2nde D",
    PREMIEREA: "1ère A", PREMIEREC: "1ère C", PREMIERED: "1ère D",
  };
  if (aliases[compact]) return aliases[compact];
  return value
    .replace(/^Seconde(?=\s|$)/i, "2nde")
    .replace(/^Premi[eè]re(?=\s|$)/i, "1ère")
    .replace(/^Terminale(?=\s|$)/i, "Tle");
}
export function academicLevelLabelKey(name: string | null | undefined): string {
  return formatAcademicLevelName(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}
export function toStoredAcademicLevelName(name: string): string {
  return name.replace(/^2nde(?=\s|$)/i, "Seconde").replace(/^1ère(?=\s|$)/i, "Première").replace(/^Tle(?=\s|$)/i, "Terminale");
}
