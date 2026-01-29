// Parsii ISO8601-merkkijonon Date-olioksi.
export const parseIsoDateTime = (value: string): Date | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};
