"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Plus, ChevronDown, HelpCircle, Loader2 } from "lucide-react";
import { useClientsQuery, useTeamQuery, useInvalidateQueries } from "@/lib/query/hooks";
import type { TeamMemberView } from "@/lib/team";

interface DraftLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface QuickCreateDraft {
  clientId: string | null;
  title: string;
  startTime: string;
  endTime: string;
}

interface QuickCreateJobPopoverProps {
  anchorPoint: { x: number; y: number } | null;
  initialStart: Date;
  initialEnd: Date;
  jobs: Array<{ start_time: string; end_time: string; is_anytime?: boolean }>;
  onClose: () => void;
  onCreated: () => void;
  onMoreOptions: (draft: QuickCreateDraft) => void;
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeInputValue(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function withDatePart(base: Date, dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(base);
  next.setFullYear(y, m - 1, d);
  return next;
}

function withTimePart(base: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const next = new Date(base);
  next.setHours(h, m, 0, 0);
  return next;
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Jobber-style quick-add: click empty calendar space, get a compact popover
 * anchored right there instead of a centered dialog. Only title/client/time
 * are required - everything else (instructions, line items, assignees,
 * anytime) is optional and mirrors the full JobCreationModal's fields at a
 * smaller scale. "More options" hands off to that full modal for anything
 * this popover doesn't cover (recurrence, equipment, tags, etc).
 */
export function QuickCreateJobPopover({
  anchorPoint,
  initialStart,
  initialEnd,
  jobs,
  onClose,
  onCreated,
  onMoreOptions,
}: QuickCreateJobPopoverProps) {
  const invalidate = useInvalidateQueries();

  const [clientQuery, setClientQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientLabel, setClientLabel] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);
  const [title, setTitle] = useState("");
  const [showInstructions, setShowInstructions] = useState(false);
  const [description, setDescription] = useState("");
  const [showLineItems, setShowLineItems] = useState(false);
  const [lineItems, setLineItems] = useState<DraftLineItem[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [isAnytime, setIsAnytime] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientsQuery = useClientsQuery(clientQuery);
  const teamQuery = useTeamQuery();
  const members = ((teamQuery.data ?? []) as TeamMemberView[]).filter(
    (m) => m.kind === "member" && m.user_id,
  );

  // Reset the whole draft every time a new click opens the popover.
  useEffect(() => {
    if (!anchorPoint) return;
    setClientQuery("");
    setClientId(null);
    setClientLabel("");
    setShowClientResults(false);
    setTitle("");
    setShowInstructions(false);
    setDescription("");
    setShowLineItems(false);
    setLineItems([]);
    setShowAssign(false);
    setAssigneeIds([]);
    setStart(initialStart);
    setEnd(initialEnd);
    setIsAnytime(false);
    setShowAvailability(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorPoint]);

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }]);
  }

  function updateLineItem(index: number, patch: Partial<DraftLineItem>) {
    setLineItems((prev) => prev.map((li, i) => (i === index ? { ...li, ...patch } : li)));
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  const conflicts = jobs.filter((j) => {
    if (j.is_anytime || isAnytime) return false;
    const jStart = new Date(j.start_time);
    const jEnd = new Date(j.end_time);
    return jStart < end && jEnd > start;
  });

  function buildDraft(): QuickCreateDraft {
    const startTime = isAnytime ? startOfLocalDay(start).toISOString() : start.toISOString();
    const endTime = isAnytime ? endOfLocalDay(start).toISOString() : end.toISOString();
    return { clientId, title, startTime, endTime };
  }

  async function handleSave() {
    if (!clientId) {
      setError("Pick a client first");
      return;
    }
    if (!title.trim()) {
      setError("Add a title");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const draft = buildDraft();
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          client_id: draft.clientId,
          start_time: draft.startTime,
          end_time: draft.endTime,
          is_anytime: isAnytime,
          description: showInstructions && description.trim() ? description : undefined,
          line_items:
            showLineItems && lineItems.some((li) => li.description.trim())
              ? lineItems
                  .filter((li) => li.description.trim())
                  .map((li) => ({ description: li.description, quantity: li.quantity, unit_price: li.unitPrice }))
              : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create job");
      }
      const job = await res.json();

      if (assigneeIds.length > 0 && job?.id) {
        await fetch("/api/org/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id, memberUserIds: assigneeIds }),
        });
      }

      await Promise.all([invalidate.jobs(), invalidate.visits()]);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover open={!!anchorPoint} onOpenChange={(open) => { if (!open) onClose(); }}>
      <PopoverAnchor asChild>
        <div style={{ position: "fixed", left: anchorPoint?.x ?? 0, top: anchorPoint?.y ?? 0, width: 0, height: 0 }} />
      </PopoverAnchor>
      <PopoverContent className="w-[340px] space-y-3" onOpenAutoFocus={(e) => e.preventDefault()}>
        {error && <div className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">{error}</div>}

        <div className="relative">
          <Input
            placeholder="Search client or address"
            value={clientId ? clientLabel : clientQuery}
            onChange={(e) => {
              setClientId(null);
              setClientQuery(e.target.value);
              setShowClientResults(true);
            }}
            onFocus={() => setShowClientResults(true)}
          />
          {showClientResults && clientQuery.trim() && !clientId && (
            <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border bg-white shadow-md">
              {(clientsQuery.data as Array<{ id: string; name: string; address?: string }> | undefined)?.length ? (
                (clientsQuery.data as Array<{ id: string; name: string; address?: string }>).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      setClientId(c.id);
                      setClientLabel(c.address ? `${c.name} - ${c.address}` : c.name);
                      setShowClientResults(false);
                    }}
                  >
                    <div className="font-medium text-gray-900">{c.name}</div>
                    {c.address && <div className="text-xs text-gray-500">{c.address}</div>}
                  </button>
                ))
              ) : (
                <div className="px-3 py-1.5 text-sm text-gray-500">No matches</div>
              )}
            </div>
          )}
        </div>

        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

        {!showInstructions ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowInstructions(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add instructions
          </Button>
        ) : (
          <Textarea
            placeholder="Instructions for the crew"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        )}

        {!showLineItems ? (
          <Button type="button" variant="outline" size="sm" onClick={() => { setShowLineItems(true); addLineItem(); }}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add line item
          </Button>
        ) : (
          <div className="space-y-2 rounded-md border border-gray-100 p-2">
            {lineItems.map((li, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input
                  placeholder="Description"
                  value={li.description}
                  onChange={(e) => updateLineItem(i, { description: e.target.value })}
                  className="h-8 flex-1 text-xs"
                />
                <Input
                  type="number"
                  min={0}
                  value={li.quantity}
                  onChange={(e) => updateLineItem(i, { quantity: Number(e.target.value) })}
                  className="h-8 w-12 text-xs"
                />
                <Input
                  type="number"
                  min={0}
                  placeholder="$"
                  value={li.unitPrice}
                  onChange={(e) => updateLineItem(i, { unitPrice: Number(e.target.value) })}
                  className="h-8 w-16 text-xs"
                />
                <button type="button" onClick={() => removeLineItem(i)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={addLineItem}>
              <Plus className="mr-1 h-3 w-3" /> Add another
            </Button>
          </div>
        )}

        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAssign((v) => !v)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Assign{assigneeIds.length > 0 ? ` (${assigneeIds.length})` : ""}
          </Button>
          {showAssign && (
            <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-md border border-gray-100 p-2">
              {members.length === 0 && <div className="text-xs text-gray-500">No team members yet</div>}
              {members.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={assigneeIds.includes(m.user_id!)}
                    onChange={() => toggleAssignee(m.user_id!)}
                  />
                  <Avatar className="h-5 w-5">
                    <AvatarFallback style={{ backgroundColor: m.calendar_color || "#e5e7eb" }} className="text-[9px] text-white">
                      {m.name.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {m.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Start date</label>
            <Input
              type="date"
              value={toDateInputValue(start)}
              onChange={(e) => {
                setStart((prev) => withDatePart(prev, e.target.value));
                setEnd((prev) => withDatePart(prev, e.target.value));
              }}
              className="h-8 text-xs"
            />
          </div>
          {!isAnytime && (
            <>
              <div className="flex-1">
                <label className="text-xs text-gray-500">Start</label>
                <Input
                  type="time"
                  value={toTimeInputValue(start)}
                  onChange={(e) => setStart((prev) => withTimePart(prev, e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500">End</label>
                <Input
                  type="time"
                  value={toTimeInputValue(end)}
                  onChange={(e) => setEnd((prev) => withTimePart(prev, e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <button
                type="button"
                title="Reset to the clicked time"
                onClick={() => { setStart(initialStart); setEnd(initialEnd); }}
                className="mb-1.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={isAnytime} onChange={(e) => setIsAnytime(e.target.checked)} />
          Anytime
        </label>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" checked={showAvailability} onChange={(e) => setShowAvailability(e.target.checked)} />
            Show availability
          </label>
          <HelpCircle className="h-3.5 w-3.5 text-gray-400" />
        </div>
        {showAvailability && (
          <div className={`text-xs ${conflicts.length > 0 ? "text-amber-600" : "text-green-600"}`}>
            {isAnytime
              ? "No specific time to check"
              : conflicts.length > 0
                ? `${conflicts.length} other job${conflicts.length > 1 ? "s" : ""} already scheduled at this time`
                : "No conflicts"}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onMoreOptions(buildDraft())}>
            More options
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="bg-green-700 hover:bg-green-800">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                Save <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
