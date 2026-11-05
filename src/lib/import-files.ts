import Papa from "papaparse";

export async function readImportFile(file: File): Promise<Record<string, string>[]> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Choose a file smaller than 10 MB.");
  if (/\.csv$/i.test(file.name)) {
    const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: "greedy", transformHeader: h => h.replace(/^\uFEFF/, "").trim() });
    if (parsed.errors.length) throw new Error(`Could not read CSV: ${parsed.errors[0]?.message}`);
    return parsed.data;
  }
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Choose an Excel (.xlsx) or CSV file.");
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook is empty.");
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, col) => { headers[col - 1] = cell.text.trim(); });
  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const values: Record<string, string> = {};
    headers.forEach((header, col) => { if (header) values[header] = row.getCell(col + 1).text.trim(); });
    if (Object.values(values).some(Boolean)) rows.push(values);
  });
  return rows;
}

export async function downloadImportTemplate(headers: string[], rows: string[][], name: string) {
  const { Workbook } = await import("exceljs");
  const book = new Workbook();
  const sheet = book.addWorksheet("Import");
  sheet.addRow(headers);
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach(column => { column.width = 25; });
  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}