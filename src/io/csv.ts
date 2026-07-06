/** Escapes values for RFC-style CSV output. */
export const escapeCsvValue = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

/** Joins a row of values into a CSV line. */
export const formatCsvRow = (values: Array<string | number | boolean | null | undefined>): string =>
  values.map(escapeCsvValue).join(',');
