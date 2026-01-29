/**
 * Parsii ISO8601-merkkijonon Date-olioksi.
 *
 * Oletus:
 * - Frontend lähettää ISO8601-aikoja, joissa on mukana aikavyöhyketieto
 *   (esim. 2026-01-27T10:00:00+02:00 tai 2026-01-27T08:00:00Z).
 * - Käyttäjä toimii Europe/Helsinki-ajassa, mutta ISO-stringi sisältää
 *   offsetin, joten new Date(value) tuottaa oikean UTC-hetken.
 */
export const parseIsoDateTime = (value: string): Date | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};
