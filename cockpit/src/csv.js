// Minimal CSV parser. Handles quoted fields containing commas and escaped
// quotes ("") — customer_quotes.csv needs both — and coerces numeric-looking
// values to numbers so the model can do arithmetic without casting everywhere.
export function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").trim();

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cols) => {
    const out = {};
    headers.forEach((header, i) => {
      const raw = cols[i] === undefined ? "" : cols[i];
      const num = Number(raw);
      out[header] = raw !== "" && raw.trim() !== "" && !Number.isNaN(num) ? num : raw;
    });
    return out;
  });
}
