export function spreadsheetCell(value: string | number | undefined): string {
  const raw = value === undefined ? "" : String(value);
  const safe = /^(?:'|[\t\r\n]|\s*[=+\-@])/u.test(raw) ? "'" + raw : raw;
  return '"' + safe.replaceAll('"', '""') + '"';
}
