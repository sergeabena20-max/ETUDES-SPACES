/** Affiche les niveaux scolaires camerounais avec leurs abréviations usuelles sans changer les valeurs stockées. */
export function formatAcademicLevelName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .replace(/^Seconde(?=\s|$)/i, "2nde")
    .replace(/^Premi[eè]re(?=\s|$)/i, "1ère")
    .replace(/^Terminale(?=\s|$)/i, "Tle");
}
