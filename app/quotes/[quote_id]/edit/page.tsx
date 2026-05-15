"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QuoteTable from "@/components/quote-table";
import PdfPreviewModal from "@/components/pdf-preview-modal";
import { MicButton } from "@/components/mic-button";
import type { Quote, ChatMessage, QuoteLineItem } from "@/types/database";
import {
  CATEGORY_LABELS,
  type JobType,
  type JobCategory,
  type LaborMode,
  type TaxBasis,
} from "@/lib/prompts/knowledge-base";

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

// ─── Job Settings Section ───────────────────────────────────────────────────
// Pre-chat filters the owner picks BEFORE starting the clarification chat.
// These get saved to the quote and passed into all three AI prompts as
// system-message context, so the AI knows what kind of job this is from
// the first message instead of having to figure it out from the scope.
function JobSettingsSection({
  quote,
  onFieldSave,
}: {
  quote: Quote;
  onFieldSave: (field: string, value: string | number | null) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [jobType, setJobType] = useState<JobType>(
    (quote.job_type as JobType | null) ?? "residential"
  );
  const [jobCategory, setJobCategory] = useState<JobCategory | "">(
    (quote.job_category as JobCategory | null) ?? ""
  );
  const [laborMode, setLaborMode] = useState<LaborMode>(
    (quote.labor_mode as LaborMode | null) ?? "margin_on_cost"
  );
  const [laborRate, setLaborRate] = useState<string>(
    quote.labor_rate_per_hour != null ? String(quote.labor_rate_per_hour) : ""
  );
  const [taxRate, setTaxRate] = useState<string>(
    quote.tax_rate != null ? String(quote.tax_rate) : ""
  );
  const [taxBasis, setTaxBasis] = useState<TaxBasis>(
    (quote.tax_basis as TaxBasis | null) ?? "materials"
  );

  function handleJobTypeChange(value: JobType) {
    setJobType(value);
    onFieldSave("job_type", value);
  }

  function handleJobCategoryChange(value: string) {
    const newCategory = value === "" ? null : (value as JobCategory);
    setJobCategory(newCategory ?? "");
    onFieldSave("job_category", newCategory);
  }

  function handleLaborModeChange(value: LaborMode) {
    setLaborMode(value);
    onFieldSave("labor_mode", value);
  }

  function handleLaborRateBlur() {
    const trimmed = laborRate.trim();
    if (trimmed === "") {
      onFieldSave("labor_rate_per_hour", null);
      return;
    }
    const num = parseFloat(trimmed);
    if (!isNaN(num) && num > 0) {
      onFieldSave("labor_rate_per_hour", num);
    }
  }

  function handleTaxRateBlur() {
    const trimmed = taxRate.trim();
    if (trimmed === "") {
      onFieldSave("tax_rate", null);
      return;
    }
    const num = parseFloat(trimmed);
    if (!isNaN(num) && num >= 0 && num <= 20) {
      onFieldSave("tax_rate", num);
    }
  }

  function handleTaxBasisChange(value: TaxBasis) {
    setTaxBasis(value);
    onFieldSave("tax_basis", value);
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <CardTitle className="flex items-center justify-between text-lg">
          Job Settings
          <span className="text-sm font-normal text-muted-foreground">
            {collapsed ? "Show" : "Hide"}
          </span>
        </CardTitle>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-5">
          {/* Job Type — residential vs commercial */}
          <div>
            <Label className="mb-2 block">Job Type</Label>
            <div className="flex gap-3">
              {(["residential", "commercial"] as JobType[]).map((type) => (
                <label
                  key={type}
                  className={`flex flex-1 cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition ${
                    jobType === type
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="job_type"
                    value={type}
                    checked={jobType === type}
                    onChange={() => handleJobTypeChange(type)}
                    className="sr-only"
                  />
                  {type === "residential" ? "Residential" : "Commercial"}
                </label>
              ))}
            </div>
          </div>

          {/* Job Category — preset that primes the AI with category templates */}
          <div>
            <Label htmlFor="job_category" className="mb-2 block">
              Job Category{" "}
              <span className="font-normal text-muted-foreground">
                — helps the AI pre-load the right line items
              </span>
            </Label>
            <select
              id="job_category"
              value={jobCategory}
              onChange={(e) => handleJobCategoryChange(e.target.value)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">— Select a category (optional) —</option>
              {(Object.keys(CATEGORY_LABELS) as JobCategory[]).map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {/* Labor Pricing Mode + conditional rate input */}
          <div>
            <Label className="mb-2 block">How you price labor</Label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50">
                <input
                  type="radio"
                  name="labor_mode"
                  value="hourly"
                  checked={laborMode === "hourly"}
                  onChange={() => handleLaborModeChange("hourly")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Hourly</div>
                  <div className="text-xs text-muted-foreground">
                    Labor billed at hours × hourly rate. No margin applied to labor.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50">
                <input
                  type="radio"
                  name="labor_mode"
                  value="margin_on_cost"
                  checked={laborMode === "margin_on_cost"}
                  onChange={() => handleLaborModeChange("margin_on_cost")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Margin on cost</div>
                  <div className="text-xs text-muted-foreground">
                    Your raw labor cost × your labor margin %. The default.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50">
                <input
                  type="radio"
                  name="labor_mode"
                  value="flat_fee"
                  checked={laborMode === "flat_fee"}
                  onChange={() => handleLaborModeChange("flat_fee")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">Flat fee per task</div>
                  <div className="text-xs text-muted-foreground">
                    A single dollar amount per labor line item. No rate × hours math.
                  </div>
                </div>
              </label>
            </div>

            {laborMode === "hourly" && (
              <div className="mt-3">
                <Label htmlFor="labor_rate_per_hour">
                  Hourly labor rate (USD)
                </Label>
                <Input
                  id="labor_rate_per_hour"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={laborRate}
                  onChange={(e) => setLaborRate(e.target.value)}
                  onBlur={handleLaborRateBlur}
                  placeholder="e.g., 95.00"
                />
              </div>
            )}
          </div>

          {/* Sales tax: rate + basis. Inherits from company defaults; editable
              per-quote so the owner can handle one-off jobs (different state,
              tax-exempt customer, etc.). */}
          <div>
            <Label className="mb-2 block">Sales tax (this quote)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor="tax_rate"
                  className="text-xs font-normal text-muted-foreground"
                >
                  Rate %
                </Label>
                <Input
                  id="tax_rate"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  min="0"
                  max="20"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  onBlur={handleTaxRateBlur}
                  placeholder="e.g., 9.375"
                />
              </div>
              <div>
                <Label
                  htmlFor="tax_basis"
                  className="text-xs font-normal text-muted-foreground"
                >
                  Apply to
                </Label>
                <select
                  id="tax_basis"
                  value={taxBasis}
                  onChange={(e) =>
                    handleTaxBasisChange(e.target.value as TaxBasis)
                  }
                  className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="materials">Materials only</option>
                  <option value="subtotal">Full subtotal</option>
                  <option value="none">No tax</option>
                </select>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Leave rate blank or pick &quot;No tax&quot; to hide the tax line
              on the PDF.
            </p>
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
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "whitespace-pre-wrap rounded-br-sm bg-blue-600 text-white"
            : "rounded-bl-sm bg-zinc-100 text-zinc-900"
        }`}
      >
        {isUser ? (
          // User input shouldn't be rendered as markdown — XSS surface + the
          // user typed plain text. whitespace-pre-wrap (above) preserves
          // line breaks they entered.
          content
        ) : (
          // Assistant responses render with markdown so **bold** and lists
          // display properly. Lock down disallowedElements to anything that
          // could navigate / load remote content / inject scripts.
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
                <p className="mb-2 last:mb-0">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-2 ml-5 list-disc last:mb-0">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 ml-5 list-decimal last:mb-0">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="mb-1 last:mb-0">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => (
                <code className="rounded bg-zinc-200 px-1 py-0.5 text-[0.85em]">
                  {children}
                </code>
              ),
              // Treat headings as bold paragraphs — keeps the visual rhythm
              // of the bubble consistent and avoids huge h1/h2 fonts.
              h1: ({ children }) => (
                <p className="mb-1 font-semibold">{children}</p>
              ),
              h2: ({ children }) => (
                <p className="mb-1 font-semibold">{children}</p>
              ),
              h3: ({ children }) => (
                <p className="mb-1 font-semibold">{children}</p>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
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
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-medium">
            Describe the job like you&apos;d tell a coworker on the phone.
          </p>
          <p className="mt-1 text-blue-800">
            The AI will ask follow-up questions to fill in the gaps. Voice-to-text
            is fine — it doesn&apos;t need to be cleaned up.
          </p>
          <p className="mt-2 text-xs italic text-blue-700">
            Example: &ldquo;Upgrading 100A panel to 200A in a 1950s house in
            Springfield, attached garage panel, plus running a new 50A circuit
            for an EV charger in the garage.&rdquo;
          </p>
        </div>
        <Textarea
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          placeholder="Type or paste the scope of work here..."
          rows={8}
          className="resize-y"
        />
        {/* Action row: Start Chat + optional mic for voice-to-text dictation.
            Mic is hidden entirely in browsers without Web Speech support. */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onSubmit(scope)}
            disabled={disabled || !scope.trim()}
            size="lg"
          >
            Start Chat
          </Button>
          <MicButton
            onTranscript={(t) =>
              // Append final transcript chunks with a space separator so the
              // user can keep speaking without losing what they already typed.
              setScope((prev) => (prev ? prev + " " + t : t))
            }
            disabled={disabled}
          />
          <span className="text-xs text-muted-foreground">
            Click the mic to dictate
          </span>
        </div>
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Max height for the message textarea. ~180px ≈ 6 rows at default font.
  // Scrollbar kicks in beyond that so the page doesn't get pushed around.
  const MAX_INPUT_HEIGHT_PX = 180;

  // Auto-scroll to the bottom whenever messages change or streaming content updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Resize the textarea to fit its content, up to MAX_INPUT_HEIGHT_PX.
  // Wrapped in rAF to avoid React 19 strict-mode flicker (setting height
  // synchronously during onChange can race with React's render cycle).
  function resizeInput() {
    const el = inputRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.height = "auto";
      el.style.height =
        Math.min(el.scrollHeight, MAX_INPUT_HEIGHT_PX) + "px";
    });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    resizeInput();
  }

  function handleSend() {
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput("");
    // Reset the textarea height after sending so it goes back to 1 row.
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) el.style.height = "auto";
    });
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

      {/* Message input area — auto-expanding textarea (1–6 rows) so long
          replies are visible while typing instead of getting clipped. */}
      <div className="border-t p-4">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter inserts a newline (standard chat UX)
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your reply... (Shift+Enter for newline)"
            disabled={isStreaming || isGenerating}
            rows={1}
            className="min-h-[40px] resize-none overflow-y-auto"
          />
          <MicButton
            onTranscript={(t) => {
              // Append + trigger the textarea resize so the input expands
              // to fit the dictated text.
              setInput((prev) => (prev ? prev + " " + t : t));
              resizeInput();
            }}
            disabled={isStreaming || isGenerating}
          />
          <Button
            onClick={handleSend}
            disabled={isStreaming || isGenerating || !input.trim()}
          >
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
  // Controls the PDF preview modal visibility
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

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

  // Auto-save a single quote field when the user changes/blurs an input.
  // Accepts string | number | null because job_category can be cleared (null)
  // and labor_rate_per_hour is a decimal.
  const handleFieldSave = useCallback(
    async (field: string, value: string | number | null) => {
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

        {/* Section 2: Job Settings — pre-chat filters that the AI uses as context */}
        <JobSettingsSection quote={quote} onFieldSave={handleFieldSave} />

        {/* Section 3: Scope Input (Phase A) or Chat (Phase B) */}
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
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => setPdfModalOpen(true)}
                  >
                    Preview &amp; Download PDF
                  </Button>
                  <PdfPreviewModal
                    quoteId={quoteId}
                    quoteNumber={quote.quote_number}
                    clientName={quote.client_name}
                    createdAt={
                      quote.created_at || new Date().toISOString()
                    }
                    open={pdfModalOpen}
                    onOpenChange={setPdfModalOpen}
                  />
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
