const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const ONGOING = /^(present|current|ongoing|now)$/i;

/** Best-effort parse of free-text resume dates like "June 2024", "06/2024", "2024". */
export function parseApproxDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  if (ONGOING.test(s)) return new Date('2100-01-01');

  // "June 2024", "Jun 2024"
  let m = s.match(/^([a-zA-Z]+)\.?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    if (month !== undefined) return new Date(Number(m[2]), month, 1);
  }

  // "2024-06" or "2024/06"
  m = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, 1);

  // "06/2024" or "6-2024"
  m = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Number(m[2]), Number(m[1]) - 1, 1);

  // Just a year: "2024"
  m = s.match(/^(\d{4})$/);
  if (m) return new Date(Number(m[1]), 0, 1);

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  return null;
}

/** Effective date used to sort a profile item newest-first: end date, else start date, else creation time. */
export function effectiveItemDate(item: {
  startDate?: string;
  endDate?: string;
  createdAt: string;
}): number {
  const parsed = parseApproxDate(item.endDate) ?? parseApproxDate(item.startDate);
  return parsed ? parsed.getTime() : new Date(item.createdAt).getTime();
}
