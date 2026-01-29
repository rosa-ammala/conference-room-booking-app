export function parseUtcIsoString(value: string): Date {
  return new Date(value);
}

export function toUtcIsoString(date: Date): string {
  return date.toISOString();
}

//Muotoilee ISO 8601 UTC -ajan käyttäjälle näytettävään muotoon "HH:mm".
// Käyttää paikallista aikaa (selaimen timezone).
export function formatTimeFromUtcIso(iso: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');

  return `${hh}:${mm}`;
}

//Onko annettu aloitusaika menneisyydessä suhteessa "nyt"-hetkeen?
export function isStartInPast(
  startIsoUtc: string,
  referenceUtc: Date = new Date(),
): boolean {
  const start = new Date(startIsoUtc);
  return start.getTime() <= referenceUtc.getTime();
}

// Muuntaa Date-olion (paikallinen) päiväavaimeksi muodossa "YYYY-MM-DD".
export function toDateKeyUtc(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-11 -> 1-12
  const day = date.getDate();

  const yyyy = year.toString().padStart(4, '0');
  const mm = month.toString().padStart(2, '0');
  const dd = day.toString().padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

// Palauttaa Date-olion, joka edustaa päivän alkua (00:00:00.000) paikallisessa ajassa 
// annetun "YYYY-MM-DD" -päiväavaimen perusteella.
export function fromDateKeyUtc(dateKey: string): Date {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  // Paikallinen aika
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

//Palauttaa tämän päivän päiväavaimen (paikallinen aika).
export function todayDateKeyUtc(): string {
  const now = new Date();
  return toDateKeyUtc(now);
}

// Lisää tai vähentää päiviä "YYYY-MM-DD" -päiväavaimesta.
export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = fromDateKeyUtc(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKeyUtc(date);
}

// Lisää tai vähentää kuukausia "YYYY-MM-DD" -päiväavaimesta,
// että päivä pysyy samana tai clampataan kuukauden loppuun.
export function addMonthsToDateKey(dateKey: string, months: number): string {
  const date = fromDateKeyUtc(dateKey);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  const day = date.getDate();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12; // modulo, joka toimii myös negatiivisille

  // Asetetaan päivä 1, sitten lisätään päivä offset myöhemmin
  const firstOfTarget = new Date(targetYear, normalizedMonth, 1, 0, 0, 0, 0);
  const maxDayInMonth = daysInMonth(firstOfTarget);

  const clampedDay = Math.min(day, maxDayInMonth);
  const finalDate = new Date(targetYear, normalizedMonth, clampedDay, 0, 0, 0, 0);

  return toDateKeyUtc(finalDate);
}

function daysInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  // Kuukauden viimeinen päivä = seuraavan kuukauden 0. päivä
  const lastDay = new Date(year, month + 1, 0, 0, 0, 0, 0);
  return lastDay.getDate();
}

// Palauttaa kuukauden nimen suomeksi (esim. "tammikuu").
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
  return names[date.getMonth()] ?? '';
}