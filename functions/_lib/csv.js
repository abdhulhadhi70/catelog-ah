/**
 * CSV parser for Google Sheets "Publish to web -> CSV" output.
 *
 * Handles: quoted cells, commas and line breaks inside quotes, doubled quotes
 * (""), a UTF-8 BOM, CRLF or LF line endings, and blank lines.
 * Cell values are returned untouched; trimming happens in normalize.js.
 */

/** Parse CSV text into an array of rows (each row an array of strings). */
export function parseCSV(text) {
  if (typeof text !== "string") return [];
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false; // has this field had any character yet?

  const endField = () => {
    row.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (c === "\r" && text[i + 1] === "\n") {
        // Keep line breaks inside a cell as plain \n.
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"' && field.trim() === "") {
      // An opening quote (leading spaces before it are dropped).
      field = "";
      inQuotes = true;
      fieldStarted = true;
    } else if (c === ",") {
      endField();
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      field += c;
      fieldStarted = true;
    }
  }

  // Last row, unless the file ended with a newline.
  if (fieldStarted || field !== "" || row.length > 0) endRow();

  return rows;
}

/** Turn a header like " Offer Price " into "offer_price". */
export function headerKey(h) {
  return String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/**
 * Parse CSV text into objects keyed by the header row.
 * Each object gets `__row`: its row number as shown in Google Sheets
 * (the header is row 1). Completely empty rows are skipped.
 */
export function parseCSVObjects(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map(headerKey);
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (cells.every((c) => c.trim() === "")) continue;
    const obj = { __row: r + 1 };
    headers.forEach((h, i) => {
      if (h) obj[h] = cells[i] ?? "";
    });
    out.push(obj);
  }
  return out;
}
