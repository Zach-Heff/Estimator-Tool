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

// Local types for the File System Access API. This lives in modern
// lib.dom.d.ts but isn't reliably picked up by this project's TS config.
// We declare only the bits we actually use — no need to mirror the full
// spec just to satisfy the typechecker.
interface FsaWritableStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}
interface FsaFileHandle {
  createWritable(): Promise<FsaWritableStream>;
}
interface FsaSaveOptions {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}
declare global {
  interface Window {
    showSaveFilePicker?: (options?: FsaSaveOptions) => Promise<FsaFileHandle>;
  }
}

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

  // Trigger a file download. Prefers the File System Access API so the
  // user gets a native "Save As" dialog and can pick the filename + folder.
  // Falls back to the <a download> trick for browsers that don't support
  // the API (Firefox, Safari as of 2026). Without this, Chrome/Arc just
  // silently dumped the PDF into the default Downloads folder.
  //
  // The suggested filename comes from makePdfFilename() so it's the same
  // richer "Quote Q-1002 - Jane Doe - 2026-05-16.pdf" form regardless of
  // which code path the browser takes. The Chrome PDF viewer's own
  // download icon still ignores this — users get the better filename only
  // when they use the Download button below.
  async function handleDownload() {
    if (!pdfUrl) return;
    const suggestedName = makePdfFilename(quoteNumber, clientName, createdAt);

    // Modern path — Chromium browsers (Chrome, Arc, Edge, Brave).
    // Calling this opens the OS-native save dialog; the promise resolves
    // with a handle when the user confirms, or rejects with AbortError
    // when they cancel (which we treat as "user is done, no fallback").
    const showSaveFilePicker =
      typeof window !== "undefined" ? window.showSaveFilePicker : undefined;
    if (showSaveFilePicker) {
      try {
        const handle = await showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: "PDF file",
              accept: { "application/pdf": [".pdf"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        // Re-read the blob from our existing object URL; fetch() against a
        // blob: URL is synchronous-ish (no network) and gives us a Blob we
        // can stream into the writable.
        const blob = await (await fetch(pdfUrl)).blob();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        // AbortError = user clicked Cancel in the save dialog. That's a
        // valid choice — don't fall back, don't surface an error.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Any other failure (permission denied, quota, etc.) — fall through
        // to the <a download> fallback so the user still gets the file.
        console.warn(
          "showSaveFilePicker failed, falling back to direct download:",
          err
        );
      }
    }

    // Fallback for Firefox / Safari / older browsers: anchor download.
    // No save dialog here — browser uses its default download folder.
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = suggestedName;
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
            // Use <object> instead of <iframe> for embedded PDFs. Chromium's
            // built-in PDF viewer is more reliable inside an <object>,
            // especially when the host element is a portaled modal — iframes
            // pointed at blob: URLs sometimes triggered an unwanted "Save As"
            // dialog in Arc / Chrome and rendered as a blank gray box after
            // the user dismissed it. The <object>'s children render as a
            // graceful fallback if the browser can't show the PDF inline.
            <object
              data={pdfUrl}
              type="application/pdf"
              className="h-full w-full"
              aria-label={`Quote ${quoteNumber} PDF preview`}
            >
              <div className="flex h-full items-center justify-center p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Your browser couldn&apos;t display the PDF inline.
                  <br />
                  Click <strong>Download PDF</strong> below to view it.
                </p>
              </div>
            </object>
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
