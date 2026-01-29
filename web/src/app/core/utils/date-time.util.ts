/**
 * Parsii ISO 8601 UTC -stringin Date-olioksi.
 *
 * Esimerkki:
 *  parseUtcIsoString("2026-01-28T10:00:00Z")
 */
export function parseUtcIsoString(value: string): Date {
  return new Date(value);
}

/**
 * Muuntaa Date-olion ISO 8601 UTC -stringiksi (Z-suffiksella).
 *
 * Esimerkki:
 *  toUtcIsoString(new Date()) -> "2026-01-28T10:00:00.000Z"
 */
export function toUtcIsoString(date: Date): string {
  return date.toISOString();
}

/**
 * Muotoilee ISO 8601 UTC -ajan käyttäjälle näytettävään muotoon "HH:mm".
 *
 * Päätös:
 * - Käytetään UTC-aikaa ikään kuin se olisi toimiston paikallisaika.
 * - Ei tehdä selaimen timezone-konversiota.
 *
 * Esimerkki:
 *  formatTimeFromUtcIso("2026-01-28T10:00:00Z") -> "10:00"
 */
export function formatTimeFromUtcIso(iso: string): string {
  const date = parseUtcIsoString(iso);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');

  return `${hh}:${mm}`;
}

/**
 * Palauttaa "nyt"-ajan UTC:na Date-oliona.
 *
 * Tämä on wrapper, jotta myöhemmin testaaminen helpottuu (voi mockata).
 */
export function nowUtc(): Date {
  return new Date();
}

/**
 * Onko annettu aloitusaika (ISO UTC) menneisyydessä suhteessa "nyt"-hetkeen (UTC)?
 *
 * Käytetään myöhemmin UI:ssa:
 * - disabloimaan menneet slotit
 * - sekä menneet päivät / päivän sisällä ennen nykyhetkeä olevat aloitusajat.
 */
export function isStartInPast(
  startIsoUtc: string,
  referenceUtc: Date = nowUtc()
): boolean {
  const start = parseUtcIsoString(startIsoUtc);
  return start.getTime() <= referenceUtc.getTime();
}

/**
 * Muuntaa Date-olion (UTC) päiväavaimeksi muodossa "YYYY-MM-DD".
 *
 * Päätös:
 * - Päivä määritellään UTC-kalenteripäivänä.
 */
export function toDateKeyUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // 0-11 -> 1-12
  const day = date.getUTCDate();

  const yyyy = year.toString().padStart(4, '0');
  const mm = month.toString().padStart(2, '0');
  const dd = day.toString().padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Palauttaa Date-olion, joka edustaa päivän alkua (00:00:00.000) UTC:ssa
 * annetun "YYYY-MM-DD" -päiväavaimen perusteella.
 */
export function fromDateKeyUtc(dateKey: string): Date {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  // Date.UTC: month on 0-11
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Palauttaa tämän päivän päiväavaimen (UTC).
 */
export function todayDateKeyUtc(): string {
  const now = nowUtc();
  return toDateKeyUtc(now);
}

/**
 * Lisää tai vähentää päiviä "YYYY-MM-DD" -päiväavaimesta (UTC).
 */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = fromDateKeyUtc(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKeyUtc(date);
}

/**
 * Lisää tai vähentää kuukausia "YYYY-MM-DD" -päiväavaimesta (UTC) siten,
 * että päivä pysyy samana tai clampataan kuukauden loppuun.
 */
export function addMonthsToDateKey(dateKey: string, months: number): string {
  const date = fromDateKeyUtc(dateKey);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-11
  const day = date.getUTCDate();

  const targetMonthIndex = month + months;
  const targetYear =
    year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth =
    ((targetMonthIndex % 12) + 12) % 12; // modulo, joka toimii myös negatiivisille

  // Asetetaan päivä 1, sitten lisätään päivä offset myöhemmin
  const firstOfTarget = new Date(Date.UTC(targetYear, normalizedMonth, 1, 0, 0, 0, 0));
  const maxDayInMonth = daysInMonth(firstOfTarget);

  const clampedDay = Math.min(day, maxDayInMonth);
  const finalDate = new Date(Date.UTC(targetYear, normalizedMonth, clampedDay, 0, 0, 0, 0));

  return toDateKeyUtc(finalDate);
}

function daysInMonth(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-11
  // Kuukauden viimeinen päivä = seuraavan kuukauden 0. päivä
  const lastDay = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0, 0));
  return lastDay.getUTCDate();
}

/**
 * Palauttaa kuukauden nimen suomeksi (esim. "tammikuu").
 */
export function getMonthNameFi(date: Date): string {
  const names = [
    'tammikuu',
    'helmikuu',
    'maaliskuu',
    'huhtikuu',
    'toukokuu',
    'kesäkuu',
    'heinäkuu',
    'elokuu',
    'syyskuu',
    'lokakuu',
    'marraskuu',
    'joulukuu',
  ];
  return names[date.getUTCMonth()] ?? '';
}