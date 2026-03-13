/** Generates a `yyyymmddhhmm` timestamp string from the current date/time. */
export function generateTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/** Prefixes a base filename with a `yyyymmddhhmm-` timestamp. */
export function timestampedFilename(base: string, date?: Date): string {
  return `${generateTimestamp(date)}-${base}`;
}
