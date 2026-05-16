"use client";

// Tax Helper — a small dialog with a single-shot AI Q&A about US sales tax.
// Used in two places:
//   1. Onboarding Step 2 — next to the company tax-rate input (replaces the
//      old salestaxhandbook.com link)
//   2. Job Settings on the quote edit page — next to the per-quote tax field
//
// The trigger is a small link-styled button by default. The dialog shows
// an input prefilled with the caller-supplied locationHint (e.g., company
// zip code), an Ask button, and the AI's answer rendered with markdown.

import { useState } from "react";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TaxHelperDialogProps {
  // Pre-fills the question input with the user's known location, so they
  // don't have to retype it. Examples: "95118", "San Jose CA 95118".
  // Null is fine — the user will type a location into the question itself.
  locationHint: string | null;
  // Trigger button label (the visible text the user clicks).
  triggerLabel?: string;
  // Trigger button style — "link" for an inline underlined link (default),
  // "button" for a regular button. Onboarding uses "link"; edit page uses
  // "link" too (kept consistent).
  triggerVariant?: "link" | "button";
}

export function TaxHelperDialog({
  locationHint,
  triggerLabel = "Ask the tax helper",
  triggerVariant = "link",
}: TaxHelperDialogProps) {
  const [open, setOpen] = useState(false);
  // Prefill question with location hint if available — the user typically
  // wants to ask about THEIR location, so this saves a step. They can edit
  // before asking.
  const initialQuestion = locationHint
    ? `What's the sales tax rate at ${locationHint}?`
    : "";
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/tax-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          locationHint: locationHint || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get an answer");
      }
      setAnswer(data.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleAskAnother() {
    setAnswer(null);
    setError(null);
    setQuestion("");
  }

  // Reset the dialog state when it closes so the next open is clean
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Slight delay so the reset isn't visible during the close animation
      setTimeout(() => {
        setAnswer(null);
        setError(null);
        setQuestion(initialQuestion);
      }, 200);
    }
  }

  return (
    <>
      {/* Trigger — rendered outside the Dialog. We control `open` ourselves
          so we don't need DialogTrigger / asChild (Base UI's Dialog doesn't
          support asChild the way Radix does). */}
      {triggerVariant === "link" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
        >
          <Sparkles className="h-3 w-3" />
          {triggerLabel}
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="mr-1 h-4 w-4" />
          {triggerLabel}
        </Button>
      )}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tax Helper</DialogTitle>
          <DialogDescription>
            Ask about US sales tax rates, what&apos;s taxed in your state, or
            which tax basis to pick. Answers are AI-generated — verify with
            your state Department of Revenue before relying on them.
          </DialogDescription>
        </DialogHeader>

        {/* Input + Ask — hidden when we have an answer so the answer has room */}
        {!answer && (
          <div className="space-y-3">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="e.g., What's the rate in San Jose CA 95118?"
              disabled={loading}
              autoFocus
            />
            <div className="flex justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Tip: include city/state or a zip code for a specific rate.
              </p>
              <Button
                onClick={handleAsk}
                disabled={loading || !question.trim()}
              >
                {loading ? "Asking…" : "Ask"}
              </Button>
            </div>
          </div>
        )}

        {/* Loading spinner shown beneath the input while we wait */}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>Thinking…</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Answer area — uses react-markdown so **bold** and `code` render
            properly. Locked-down disallowedElements mirrors the chat bubble
            (no links, no raw HTML). */}
        {answer && (
          <div className="space-y-3">
            <div className="rounded-md bg-blue-50 p-3 text-sm text-zinc-900">
              <ReactMarkdown
                disallowedElements={[
                  "a",
                  "img",
                  "script",
                  "iframe",
                  "style",
                  "html",
                  "body",
                  "link",
                ]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 leading-relaxed last:mb-0">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-blue-900">
                      {children}
                    </strong>
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">
                      {children}
                    </code>
                  ),
                  em: ({ children }) => (
                    <em className="italic">{children}</em>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 ml-5 list-disc last:mb-0">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 ml-5 list-decimal last:mb-0">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="mb-1 last:mb-0">{children}</li>
                  ),
                }}
              >
                {answer}
              </ReactMarkdown>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleAskAnother}>
                Ask another question
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
        </DialogContent>
      </Dialog>
    </>
  );
}
