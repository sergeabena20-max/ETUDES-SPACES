/** Affiche les niveaux scolaires camerounais avec leurs abréviations usuelles sans changer les valeurs stockées. */
export function formatAcademicLevelName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .replace(/^Seconde(?=\s|$)/i, "2nde")
    .replace(/^Premi[eè]re(?=\s|$)/i, "1ère")
    .replace(/^Terminale(?=\s|$)/i, "Tle");
}

/** Convertit les abréviations saisies dans l'administration vers les noms canoniques déjà utilisés en base. */
export function toStoredAcademicLevelName(name: string): string {
  return name
    .replace(/^2nde(?=\s|$)/i, "Seconde")
    .replace(/^1ère(?=\s|$)/i, "Première")
    .replace(/^Tle(?=\s|$)/i, "Terminale");
}
