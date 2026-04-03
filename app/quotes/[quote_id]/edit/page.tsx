"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QuoteTable from "@/components/quote-table";
import type { Quote, ChatMessage, QuoteLineItem } from "@/types/database";

// ─── Client Info Section ────────────────────────────────────────────────────
// Collapsible section at the top for entering client/job details.
// Each field auto-saves on blur (when the user clicks out of the field).
function ClientInfoSection({
  quote,
  onFieldSave,
}: {
  quote: Quote;
  onFieldSave: (field: string, value: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const [clientName, setClientName] = useState(quote.client_name || "");
  const [clientEmail, setClientEmail] = useState(quote.client_email || "");
  const [clientAddress, setClientAddress] = useState(
    quote.client_address || ""
  );
  const [jobSiteAddress, setJobSiteAddress] = useState(
    quote.job_site_address || ""
  );

  // When "Same as client address" is checked, sync the job site address
  function handleSameAddressToggle() {
    const newValue = !sameAddress;
    setSameAddress(newValue);
    if (newValue) {
      setJobSiteAddress(clientAddress);
      onFieldSave("job_site_address", clientAddress);
    }
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <CardTitle className="flex items-center justify-between text-lg">
          Client Information
          <span className="text-sm font-normal text-muted-foreground">
            {collapsed ? "Show" : "Hide"}
          </span>
        </CardTitle>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                onBlur={() => onFieldSave("client_name", clientName)}
                placeholder="e.g., John Smith"
              />
            </div>
            <div>
              <Label htmlFor="client_email">Client Email</Label>
              <Input
                id="client_email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                onBlur={() => onFieldSave("client_email", clientEmail)}
                placeholder="e.g., john@example.com"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="client_address">Client Address</Label>
            <Input
              id="client_address"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              onBlur={() => {
                onFieldSave("client_address", clientAddress);
                // If "same address" is checked, keep job site in sync
                if (sameAddress) {
                  setJobSiteAddress(clientAddress);
                  onFieldSave("job_site_address", clientAddress);
                }
              }}
              placeholder="e.g., 123 Main St, Denver, CO 80202"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Label htmlFor="job_site_address">Job Site Address</Label>
              <label className="flex items-center gap-1 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={sameAddress}
                  onChange={handleSameAddressToggle}
                  className="rounded"
                />
                Same as client address
              </label>
            </div>
            <Input
              id="job_site_address"
              value={jobSiteAddress}
              onChange={(e) => setJobSiteAddress(e.target.value)}
              onBlur={() =>
                onFieldSave("job_site_address", jobSiteAddress)
              }
              disabled={sameAddress}
              placeholder="e.g., 456 Oak Ave, Denver, CO 80203"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Typing Indicator ───────────────────────────────────────────────────────
// Three animated dots shown while waiting for Claude's response
function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-3">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─── Chat Message Bubble ────────────────────────────────────────────────────
function ChatBubble({
  role,
  content,
}: {
  role: string;
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 ${
          isUser
            ? "rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm bg-zinc-100 text-zinc-900"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

// ─── Scope Input (Phase A) ──────────────────────────────────────────────────
function ScopeInput({
  onSubmit,
  disabled,
}: {
  onSubmit: (scope: string) => void;
  disabled: boolean;
}) {
  const [scope, setScope] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Scope of Work</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="Describe the scope of work. You can paste raw voice-to-text here — it doesn't need to be cleaned up."
          rows={8}
          className="resize-y"
        />
        <Button
          onClick={() => onSubmit(scope)}
          disabled={disabled || !scope.trim()}
          size="lg"
        >
          Start Chat
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Chat Interface (Phase B) ───────────────────────────────────────────────
function ChatInterface({
  messages,
  streamingContent,
  isStreaming,
  readyToGenerate,
  isGenerating,
  hasLineItems,
  onSendMessage,
  onGenerateQuote,
}: {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  readyToGenerate: boolean;
  isGenerating: boolean;
  hasLineItems: boolean;
  onSendMessage: (msg: string) => void;
  onGenerateQuote: () => void;
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom whenever messages change or streaming content updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  function handleSend() {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput("");
  }

  return (
    <Card className="flex flex-col" style={{ height: "600px" }}>
      <CardHeader className="border-b">
        <CardTitle className="text-lg">AI Estimator Chat</CardTitle>
      </CardHeader>

      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              role={msg.role}
              // Strip the [READY_TO_GENERATE] tag from displayed messages
              content={msg.content.replace("[READY_TO_GENERATE]", "").trim()}
            />
          ))}

          {/* Show the in-progress streaming response */}
          {isStreaming && streamingContent && (
            <ChatBubble role="assistant" content={streamingContent} />
          )}

          {/* Show typing dots when waiting for the first token */}
          {isStreaming && !streamingContent && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* "Generate Quote" button appears when the AI signals it's ready
          and we haven't already generated line items */}
      {readyToGenerate && !hasLineItems && (
        <div className="border-t bg-green-50 p-4">
          <Button
            size="lg"
            className="w-full bg-green-600 text-lg font-semibold text-white hover:bg-green-700"
            onClick={onGenerateQuote}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating your quote...
              </span>
            ) : (
              "Generate Quote"
            )}
          </Button>
        </div>
      )}

      {/* Message input area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your reply..."
            disabled={isStreaming || isGenerating}
          />
          <Button onClick={handleSend} disabled={isStreaming || isGenerating || !input.trim()}>
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Main Quote Workspace Page ──────────────────────────────────────────────
export default function QuoteEditPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const quoteId = params.quote_id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtotal, setSubtotal] = useState(0);
  // Track the approved state — if review_completed_at is set, the quote is approved
  const [isApproved, setIsApproved] = useState(false);

  // Refs for scrolling to sections
  const chatRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Track whether we're in Phase A (scope input) or Phase B (chat)
  const hasStartedChat = messages.length > 0;
  const hasLineItems = lineItems.length > 0;

  // Load the quote, chat messages, and any existing line items on mount
  useEffect(() => {
    async function loadQuote() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

      if (quoteError || !quoteData) {
        setError("Quote not found");
        setLoading(false);
        return;
      }

      setQuote(quoteData);
      setIsApproved(!!quoteData.review_completed_at);

      // Load existing chat messages (supports resuming after browser close)
      const { data: chatData } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("quote_id", quoteId)
        .order("created_at", { ascending: true });

      if (chatData && chatData.length > 0) {
        setMessages(chatData);
        // Check if the AI already signaled readiness in a previous session
        const lastAssistantMsg = [...chatData]
          .reverse()
          .find((m) => m.role === "assistant");
        if (lastAssistantMsg?.content.includes("[READY_TO_GENERATE]")) {
          setReadyToGenerate(true);
        }
      }

      // Load existing line items (supports resuming after quote was already generated)
      const { data: itemsData } = await supabase
        .from("quote_line_items")
        .select("*")
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true });

      if (itemsData && itemsData.length > 0) {
        setLineItems(itemsData);
        setSubtotal(
          itemsData.reduce((sum, item) => sum + item.billable_price, 0)
        );
      }

      setLoading(false);
    }

    loadQuote();
  }, [supabase, router, quoteId]);

  // Auto-save a single quote field when the user blurs out of an input
  const handleFieldSave = useCallback(
    async (field: string, value: string) => {
      await supabase
        .from("quotes")
        .update({ [field]: value })
        .eq("id", quoteId);
    },
    [supabase, quoteId]
  );

  // Send a message to the AI and stream the response back
  async function sendMessage(messageText: string) {
    setIsStreaming(true);
    setStreamingContent("");
    setError(null);

    // Optimistically add the user message to the UI immediately
    // (the API route also saves it to the DB)
    const optimisticUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      quote_id: quoteId,
      role: "user",
      content: messageText,
      model_used: null,
      tokens_used: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId, message: messageText }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      // Read the SSE stream from the API route
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (!reader) throw new Error("No response stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // SSE events are separated by double newlines; each line starts with "data: "
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const json = JSON.parse(line.slice(6));

          if (json.type === "text") {
            accumulated += json.text;
            setStreamingContent(accumulated);
          } else if (json.type === "done") {
            // Streaming complete — add the final message to our local state
            const assistantMsg: ChatMessage = {
              id: `assistant-${Date.now()}`,
              quote_id: quoteId,
              role: "assistant",
              content: accumulated,
              model_used: "claude-sonnet-4-20250514",
              tokens_used: json.input_tokens + json.output_tokens,
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setStreamingContent("");

            // Check if the AI is signaling it's ready to generate the quote
            if (accumulated.includes("[READY_TO_GENERATE]")) {
              setReadyToGenerate(true);
            }
          } else if (json.type === "error") {
            setError(json.message);
          }
        }
      }
    } catch {
      setError(
        "I'm having trouble connecting right now. Your conversation is saved — please try again in a moment."
      );
    } finally {
      setIsStreaming(false);
    }
  }

  // Handle the initial scope submission (Phase A → Phase B transition)
  async function handleScopeSubmit(scope: string) {
    // Save the scope text to the quote record
    await supabase
      .from("quotes")
      .update({ scope_description: scope })
      .eq("id", quoteId);

    // Send the scope as the first chat message
    await sendMessage(scope);
  }

  // ─── Quote Generation ─────────────────────────────────────────────────────
  // Called when the electrician clicks "Generate Quote" after the clarification chat
  async function handleGenerateQuote() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            "Quote generation failed. Your conversation is saved — please try again."
        );
      }

      const data = await response.json();
      setLineItems(data.line_items);
      setSubtotal(data.subtotal);

      // Scroll down to the newly generated table after a brief delay
      setTimeout(() => {
        tableRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Quote generation failed. Your conversation is saved — please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  // ─── Approve Quote ────────────────────────────────────────────────────────
  // Sets review_completed_at — the mandatory review step before export
  async function handleApprove() {
    if (lineItems.length === 0) {
      setError("Cannot approve an empty quote. Add at least one line item.");
      return;
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("quotes")
      .update({ review_completed_at: now })
      .eq("id", quoteId);

    if (updateError) {
      setError("Failed to approve quote. Please try again.");
      return;
    }

    setIsApproved(true);
  }

  // ─── Totals callback from QuoteTable ──────────────────────────────────────
  const handleTotalsChange = useCallback((newSubtotal: number) => {
    setSubtotal(newSubtotal);
  }, []);

  // ─── Loading / Error States ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-muted-foreground">Loading quote...</p>
      </div>
    );
  }

  if (error && !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
            <p className="text-sm text-muted-foreground">
              {isApproved ? "Approved" : "Draft"}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Section 1: Client Info */}
        <ClientInfoSection quote={quote} onFieldSave={handleFieldSave} />

        {/* Section 2: Scope Input (Phase A) or Chat (Phase B) */}
        <div ref={chatRef}>
          {!hasStartedChat ? (
            <ScopeInput onSubmit={handleScopeSubmit} disabled={isStreaming} />
          ) : (
            <ChatInterface
              messages={messages}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
              readyToGenerate={readyToGenerate}
              isGenerating={isGenerating}
              hasLineItems={hasLineItems}
              onSendMessage={sendMessage}
              onGenerateQuote={handleGenerateQuote}
            />
          )}
        </div>

        {/* Section 3: Editable Quote Table — appears after quote generation */}
        {hasLineItems && (
          <div ref={tableRef}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quote Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteTable
                  quoteId={quoteId}
                  initialItems={lineItems}
                  initialSubtotal={subtotal}
                  defaultLaborMargin={quote.labor_margin_default ?? 20}
                  defaultMaterialMargin={quote.material_margin_default ?? 20}
                  onTotalsChange={handleTotalsChange}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 4: Review & Export — appears below the table */}
        {hasLineItems && (
          <Card>
            <CardContent className="pt-6">
              {isApproved ? (
                // Approved state — show confirmation and export placeholder
                <div className="space-y-4 text-center">
                  <div className="rounded-lg bg-green-50 p-4">
                    <p className="text-lg font-semibold text-green-800">
                      Quote Approved
                    </p>
                    <p className="mt-1 text-sm text-green-700">
                      You can now export this quote as a PDF.
                    </p>
                  </div>
                  <Button disabled className="w-full" size="lg">
                    Download PDF — coming soon
                  </Button>
                </div>
              ) : (
                // Pre-approval state — review actions
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      chatRef.current?.scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Back to Chat
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 text-white hover:bg-green-700"
                    size="lg"
                    onClick={handleApprove}
                  >
                    Approve &amp; Continue
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error banner */}
        {error && quote && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
