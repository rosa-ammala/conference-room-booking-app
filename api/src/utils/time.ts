// Lisää annettuun aikaan minuutteja ja palauttaa uuden Date-olion.
export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60_000);
};

// Palauttaa nykyhetken Date-oliona.
// Abstrahoitu omaan funktioon, jotta sen voi myöhemmin tarvittaessa mockata testeissä.
export const now = (): Date => {
  return new Date();
};

// Tarkistaa onko `a` ennen `b`.
export const isBefore = (a: Date, b: Date): boolean => {
  return a.getTime() < b.getTime();
};

// Tarkistaa onko annettu aika menneisyydessä suhteessa `now`-hetkeen.
export const isInPast = (date: Date, reference: Date = now()): boolean => {
  return isBefore(date, reference);
};

// Tarkistaa, menevätkö kaksi aikaväliä päällekkäin.
// Huom: päätepisteet käsitellään "puoliavoimina" [start, end),
// eli jos yhden varauksen end == toisen start, niitä EI pidetä päällekkäisinä.
export const intervalsOverlap = (
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean => {
  return aStart < bEnd && aEnd > bStart;
};
