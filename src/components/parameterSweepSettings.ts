/** Returns one sample for every inclusive integer period between the normalized bounds. */
export function getInclusivePeriodPointCount(start: number, end: number): number {
  const normalizedStart = Math.max(1, Math.round(start));
  const normalizedEnd = Math.max(normalizedStart + 1, Math.round(end));
  return normalizedEnd - normalizedStart + 1;
}
