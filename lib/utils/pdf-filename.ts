// Build a human-readable filename for a generated quote PDF.
//
// Format: Quote_{quote_number}_{client_lastname}_{YYYY-MM-DD}.pdf
// Example: Quote_Q-1001_Heffernan_2026-05-14.pdf
//
// If the client name is empty/null, the name segment is dropped:
//   Quote_Q-1001_2026-05-14.pdf
//
// Used in TWO places that must agree on the format:
//   - components/pdf-preview-modal.tsx (the <a download> attribute on our
//     in-modal Download button)
//   - app/api/generate-pdf/route.ts (the Content-Disposition filename;
//     respected by viewers that read the header, ignored by blob URLs)

export function makePdfFilename(
  quoteNumber: string,
  clientName: string | null,
  dateISO: string
): string {
  // Normalize the date to YYYY-MM-DD; tolerant of bad input (falls back to today)
  let datePart: string;
  try {
    const d = new Date(dateISO);
    datePart = isNaN(d.getTime())
      ? new Date().toISOString().slice(0, 10)
      : d.toISOString().slice(0, 10);
  } catch {
    datePart = new Date().toISOString().slice(0, 10);
  }

  // Extract the last word of the client name (typically the surname) and
  // strip any character that doesn't belong in a filename. Empty string
  // means "no client name segment in the filename" — filter() drops it.
  const namePart = clientName
    ? clientName.trim().split(/\s+/).pop()?.replace(/[^a-zA-Z0-9-]/g, "") ?? ""
    : "";

  return ["Quote", quoteNumber, namePart, datePart].filter(Boolean).join("_") + ".pdf";
}
