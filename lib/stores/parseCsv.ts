export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let fieldTouched = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      fieldTouched = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      fieldTouched = false;
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      fieldTouched = false;
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  const endsWithNewline =
    len > 0 && (text[len - 1] === '\n' || (text[len - 1] === '\r' && text[len - 2] === '\n'));

  if (!endsWithNewline && (field.length > 0 || row.length > 0 || fieldTouched)) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function csvRowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  const keys = header.map((h) => h.trim());
  return body.map((row) => {
    const obj: Record<string, string> = {};
    keys.forEach((key, i) => {
      obj[key] = (row[i] ?? '').trim();
    });
    return obj;
  });
}
