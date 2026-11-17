// Lecture simple d'un fichier CSV (gère les guillemets et les virgules dans les titres).
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }

  const [header, ...data] = rows.filter((r) => r.some((x) => x.trim() !== ""));
  if (!header) return [];
  const keys = header.map((h) => h.replace(/^﻿/, "").trim());
  return data.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

export type ImportRow = { title?: string; year?: string; rating?: number | null; imdbId?: string };

// Reconnaît un export Letterboxd (watched.csv, ratings.csv, diary.csv) ou IMDb (ratings.csv).
export function toImportRows(records: Record<string, string>[]): { format: "letterboxd" | "imdb"; rows: ImportRow[] } | null {
  if (records.length === 0) return null;
  const first = records[0];
  if ("Const" in first && "Your Rating" in first) {
    return {
      format: "imdb",
      rows: records
        .filter((r) => !r["Title Type"] || r["Title Type"].toLowerCase().includes("movie") || r["Title Type"] === "Film")
        .map((r) => ({
          imdbId: r["Const"],
          title: r["Title"],
          year: r["Year"],
          rating: r["Your Rating"] ? Number(r["Your Rating"]) / 2 : null, // IMDb /10 → /5
        })),
    };
  }
  if ("Name" in first && "Letterboxd URI" in first) {
    return {
      format: "letterboxd",
      rows: records.map((r) => ({
        title: r["Name"],
        year: r["Year"],
        rating: r["Rating"] ? Number(r["Rating"]) : null,
      })),
    };
  }
  return null;
}
