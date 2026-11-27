const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 5000;

/**
 * Neutralize CSV formula injection (=, +, -, @, tab, CR) when displaying or exporting cells.
 */
export function sanitizeCell(value) {
  const str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function validateImportFile(file) {
  if (!file) return 'Please select a .csv or .json file.';
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.csv') && !lower.endsWith('.json')) {
    return 'Only .csv and .json files are accepted.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'File exceeds the 5 MB maximum size limit.';
  }
  return null;
}

export function parseCsvSafe(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], error: 'File is empty.' };
  if (lines.length - 1 > MAX_ROWS) {
    return { headers: [], rows: [], error: `Import exceeds maximum of ${MAX_ROWS} rows.` };
  }
  const splitLine = (line) => line.split(',').map((c) => sanitizeCell(c.trim().replace(/^"|"$/g, '')));
  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = vals[i] ?? '';
    });
    return obj;
  });
  return { headers, rows, error: null };
}
