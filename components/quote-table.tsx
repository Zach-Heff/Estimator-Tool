"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QuoteLineItem } from "@/types/database";

// ─── Helpers ────────────────────────────────────────────────────────────────

// Format a number as USD currency (e.g., 285.00 → "$285.00")
function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

// Calculate billable price from cost, quantity, and margin
function calcBillable(unitCost: number, quantity: number, margin: number): number {
  return Math.round(unitCost * quantity * (1 + margin / 100) * 100) / 100;
}

// ─── Row Component ──────────────────────────────────────────────────────────
// Each row is its own component so it can manage its own debounced save timer
// without re-rendering the entire table on every keystroke.

function QuoteRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: QuoteLineItem;
  onUpdate: (id: string, updates: Partial<QuoteLineItem>) => void;
  onDelete: (id: string) => void;
}) {
  const [category, setCategory] = useState(item.category || "General");
  const [description, setDescription] = useState(item.description);
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [unitCost, setUnitCost] = useState(item.unit_cost.toString());
  const [marginPercent, setMarginPercent] = useState(item.margin_percent.toString());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live-calculated billable price based on current field values
  const currentQty = parseFloat(quantity) || 0;
  const currentCost = parseFloat(unitCost) || 0;
  const currentMargin = parseFloat(marginPercent) || 0;
  const billablePrice = calcBillable(currentCost, currentQty, currentMargin);

  // Debounced save — waits 1.5 seconds after the user stops typing, then saves
  const debouncedSave = useCallback(
    (updates: Partial<QuoteLineItem>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onUpdate(item.id, {
          ...updates,
          was_edited: true,
          billable_price: calcBillable(
            parseFloat(updates.unit_cost?.toString() || unitCost) || 0,
            parseFloat(updates.quantity?.toString() || quantity) || 0,
            parseFloat(updates.margin_percent?.toString() || marginPercent) || 0
          ),
        });
      }, 1500);
    },
    [item.id, onUpdate, unitCost, quantity, marginPercent]
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const isAiEstimate = item.price_source === "ai_estimate";
  const isFromPriceList = item.price_source === "contractor_list";
  const isLowConfidence = item.confidence_flag === "low";

  return (
    <tr
      className={`border-b ${
        isAiEstimate
          ? "bg-amber-50" // Light amber for AI estimates — CLAUDE.md trust requirement
          : isFromPriceList
            ? "bg-green-50" // Light green for items matched from the contractor's price list
            : ""
      }`}
    >
      {/* Type badge */}
      <td className="px-3 py-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            item.item_type === "labor"
              ? "bg-blue-100 text-blue-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {item.item_type === "labor" ? "Labor" : "Material"}
        </span>
        {/* AI estimate badge — visually distinct per CLAUDE.md */}
        {isAiEstimate && (
          <span className="ml-1 inline-block rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
            AI Estimate
          </span>
        )}
        {/* From-your-list badge — green to signal "this is YOUR actual price" */}
        {isFromPriceList && (
          <span
            className="ml-1 inline-block rounded bg-green-200 px-1.5 py-0.5 text-[10px] font-medium text-green-800"
            title="Price matched from your uploaded price list"
          >
            ✓ From Your List
          </span>
        )}
      </td>

      {/* Category — editable, used to group items in the PDF */}
      <td className="px-3 py-2 w-36">
        <Input
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            debouncedSave({ category: e.target.value });
          }}
          className="h-8 text-sm w-full"
          placeholder="e.g., Panel Upgrade"
        />
      </td>

      {/* Description — editable, wide enough to show full item names */}
      <td className="px-3 py-2 min-w-[300px]">
        <div className="flex items-center gap-1">
          <Input
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              debouncedSave({ description: e.target.value });
            }}
            className="h-8 text-sm w-full"
          />
          {/* Low confidence warning icon */}
          {isLowConfidence && (
            <span
              title="Low confidence estimate — review carefully"
              className="cursor-help text-amber-500"
            >
              ⚠️
            </span>
          )}
        </div>
      </td>

      {/* Quantity — editable */}
      <td className="px-3 py-2 w-20">
        <Input
          type="number"
          value={quantity}
          onChange={(e) => {
            setQuantity(e.target.value);
            debouncedSave({ quantity: parseFloat(e.target.value) || 0 });
          }}
          className="h-8 w-20 text-sm text-right"
          min="0"
          step="any"
        />
      </td>

      {/* Unit — display only */}
      <td className="px-3 py-2 text-sm text-muted-foreground w-16">
        {item.unit}
      </td>

      {/* Unit Cost — editable */}
      <td className="px-3 py-2 w-24">
        <Input
          type="number"
          value={unitCost}
          onChange={(e) => {
            setUnitCost(e.target.value);
            debouncedSave({ unit_cost: parseFloat(e.target.value) || 0 });
          }}
          className="h-8 w-24 text-sm text-right"
          min="0"
          step="0.01"
        />
      </td>

      {/* Margin % — editable */}
      <td className="px-3 py-2 w-20">
        <Input
          type="number"
          value={marginPercent}
          onChange={(e) => {
            setMarginPercent(e.target.value);
            debouncedSave({ margin_percent: parseFloat(e.target.value) || 0 });
          }}
          className="h-8 w-20 text-sm text-right"
          min="0"
          step="1"
        />
      </td>

      {/* Billable Price — auto-calculated, not editable */}
      <td className="px-3 py-2 text-right text-sm font-medium w-28">
        {formatCurrency(billablePrice)}
      </td>

      {/* Delete button */}
      <td className="px-3 py-2 w-10">
        <button
          onClick={() => onDelete(item.id)}
          className="text-red-400 hover:text-red-600 text-lg leading-none"
          title="Delete row"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

// ─── Main QuoteTable Component ──────────────────────────────────────────────
// Displays the editable bill of materials below the chat.
// All edits auto-save to the database with debouncing.

export default function QuoteTable({
  quoteId,
  initialItems,
  initialSubtotal,
  defaultLaborMargin,
  defaultMaterialMargin,
  onTotalsChange,
}: {
  quoteId: string;
  initialItems: QuoteLineItem[];
  initialSubtotal: number;
  defaultLaborMargin: number;
  defaultMaterialMargin: number;
  onTotalsChange: (subtotal: number) => void;
}) {
  const supabase = createClient();
  const [items, setItems] = useState<QuoteLineItem[]>(initialItems);

  // Recalculate totals whenever items change
  const subtotal = items.reduce(
    (sum, item) => sum + (item.billable_price || 0),
    0
  );

  // Notify parent of total changes for the review section
  useEffect(() => {
    onTotalsChange(subtotal);
  }, [subtotal, onTotalsChange]);

  // Update a single line item in the database
  const handleUpdate = useCallback(
    async (id: string, updates: Partial<QuoteLineItem>) => {
      // Update local state immediately for responsive UI
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        )
      );

      // Save to database
      const { error } = await supabase
        .from("quote_line_items")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error("Failed to save line item:", error);
        // TODO: Show "Not saved — retrying..." indicator on the row
      }

      // Recalculate and save quote totals
      // We read from the latest items state via a callback to avoid stale closures
      setItems((prev) => {
        const newSubtotal = prev.reduce((sum, item) => sum + item.billable_price, 0);
        const rounded = Math.round(newSubtotal * 100) / 100;
        // Fire-and-forget update to the quote totals
        supabase
          .from("quotes")
          .update({ subtotal: rounded, total: rounded })
          .eq("id", quoteId)
          .then(({ error: quoteError }) => {
            if (quoteError) console.error("Failed to update quote totals:", quoteError);
          });
        return prev;
      });
    },
    [supabase, quoteId]
  );

  // Delete a line item
  const handleDelete = useCallback(
    async (id: string) => {
      // Remove from local state immediately
      setItems((prev) => prev.filter((item) => item.id !== id));

      const { error } = await supabase
        .from("quote_line_items")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Failed to delete line item:", error);
      }
    },
    [supabase]
  );

  // Add a new blank row
  const handleAddRow = useCallback(async () => {
    const nextSortOrder = items.length > 0
      ? Math.max(...items.map((i) => i.sort_order)) + 1
      : 1;

    const newRow = {
      quote_id: quoteId,
      item_type: "material" as const,
      description: "",
      quantity: 1,
      unit: "each",
      unit_cost: 0,
      margin_percent: defaultMaterialMargin,
      billable_price: 0,
      price_source: "manual",
      confidence_flag: null,
      sort_order: nextSortOrder,
      was_edited: false,
      was_added_manually: true,
    };

    const { data, error } = await supabase
      .from("quote_line_items")
      .insert(newRow)
      .select()
      .single();

    if (error || !data) {
      console.error("Failed to add row:", error);
      return;
    }

    setItems((prev) => [...prev, data]);
  }, [supabase, quoteId, items, defaultMaterialMargin]);

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b bg-zinc-50 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <th className="px-3 py-3">Type</th>
            <th className="px-3 py-3">Category</th>
            <th className="px-3 py-3">Description</th>
            <th className="px-3 py-3 text-right">Qty</th>
            <th className="px-3 py-3">Unit</th>
            <th className="px-3 py-3 text-right">Unit Cost</th>
            <th className="px-3 py-3 text-right">Margin %</th>
            <th className="px-3 py-3 text-right">Billable Price</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <QuoteRow
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}

          {items.length === 0 && (
            <tr>
              <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                No line items yet. Click "Add Row" to add items manually.
              </td>
            </tr>
          )}
        </tbody>

        {/* Footer with totals */}
        <tfoot>
          <tr className="border-t-2 bg-zinc-50">
            <td colSpan={7} className="px-3 py-3 text-right text-sm font-semibold">
              Subtotal
            </td>
            <td className="px-3 py-3 text-right text-sm font-bold">
              {formatCurrency(subtotal)}
            </td>
            <td></td>
          </tr>
          <tr className="bg-zinc-50">
            <td colSpan={7} className="px-3 py-3 text-right text-sm font-semibold">
              Total
            </td>
            <td className="px-3 py-3 text-right text-lg font-bold text-green-700">
              {formatCurrency(subtotal)}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      {/* Add Row button */}
      <div className="border-t px-3 py-3">
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          + Add Row
        </Button>
      </div>
    </div>
  );
}
