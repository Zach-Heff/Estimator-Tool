"use client";

// Modal that fetches the generated PDF from the API and displays it in an iframe.
// The user can preview the PDF and download it with one click.

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { makePdfFilename } from "@/lib/utils/pdf-filename";

interface PdfPreviewModalProps {
  quoteId: string;
  quoteNumber: string;
  // Used (together with quoteNumber + createdAt) to build a human-readable
  // download filename. Pass null/undefined if the quote has no client yet.
  clientName: string | null;
  createdAt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PdfPreviewModal({
  quoteId,
  quoteNumber,
  clientName,
  createdAt,
  open,
  onOpenChange,
}: PdfPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the PDF from the server when the modal opens
  const fetchPdf = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate PDF");
      }

      // Convert the response to a blob and create an object URL for the iframe
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate PDF"
      );
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  // Fetch when the modal opens, clean up the blob URL when it closes
  useEffect(() => {
    if (open) {
      fetchPdf();
    } else {
      // Revoke the object URL to free memory when the modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Trigger a file download by creating a temporary <a> element.
  // `<a download>` is the most reliable way to control the filename across
  // browsers — the Chrome PDF viewer's own download icon ignores headers
  // when the source is a blob URL, so we encourage users to use THIS button.
  function handleDownload() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = makePdfFilename(quoteNumber, clientName, createdAt);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[95vh] !max-w-[95vw] flex-col">
        <DialogHeader>
          <DialogTitle>Quote Preview — {quoteNumber}</DialogTitle>
        </DialogHeader>

        {/* PDF viewer area */}
        <div className="flex-1 overflow-hidden rounded-lg border bg-zinc-100">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  Generating your PDF...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center">
                <p className="text-red-600">{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={fetchPdf}
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              className="h-full w-full"
              title="Quote PDF Preview"
            />
          )}
        </div>

        {/* Action buttons at the bottom */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleDownload} disabled={!pdfUrl || loading}>
            Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
