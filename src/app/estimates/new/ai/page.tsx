"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Image as ImageIcon,
  Info,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { resizeImage } from "@/lib/utils/image-resize";
import type { EnrichedLineItem, Trade } from "@/lib/ai/types";

/**
 * AI Estimate Wizard — /estimates/new/ai
 *
 * 4 steps:
 *   1. Capture     - 1..5 photos (camera or upload, client-side resized)
 *   2. Context     - trade, sqft, labor hr/rate, markup %, notes
 *   3. Review      - editable EnrichedLineItem[] returned by /analyze
 *   4. Finalize    - pick client, contract message, save draft / save & send
 *
 * The wizard is mobile-first: every step fits on a phone, primary action
 * sits on a sticky footer, secondary actions in the header.
 */

const MAX_PHOTOS = 5;

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface QuotaStatus {
  tier: string;
  cap: number;
  used: number;
  remaining: number;
  resetsAt: string;
  yearMonth: string;
}

interface CapturedPhoto {
  /** Original or resized blob. */
  blob: Blob;
  /** object URL for preview, revoked on remove. */
  previewUrl: string;
  filename: string;
}

interface AnalyzeResponse {
  sessionId: string;
  detectedItems: EnrichedLineItem[];
  photoPaths: string[];
  model: string;
  quota: QuotaStatus;
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    quota?: QuotaStatus;
  };
}

const TRADE_OPTIONS: Array<{ value: Trade; label: string }> = [
  { value: "general", label: "General" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "hvac", label: "HVAC" },
  { value: "carpentry", label: "Carpentry" },
  { value: "roofing", label: "Roofing" },
  { value: "painting", label: "Painting" },
  { value: "flooring", label: "Flooring" },
  { value: "drywall", label: "Drywall" },
  { value: "other", label: "Other" },
];

const STEPS = ["Capture", "Context", "Review", "Finalize"] as const;
type Step = (typeof STEPS)[number];

export default function AiEstimateWizardPage() {
  const router = useRouter();

  // --- Step / global state ---
  const [step, setStep] = useState<Step>("Capture");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [quotaWarning, setQuotaWarning] = useState<QuotaStatus | null>(null);

  // --- Step 1: photos ---
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  // --- Step 2: context ---
  const [trade, setTrade] = useState<Trade>("general");
  const [sqft, setSqft] = useState<string>("");
  const [laborHours, setLaborHours] = useState<string>("");
  const [laborRate, setLaborRate] = useState<string>("");
  const [markupPct, setMarkupPct] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [regionZip, setRegionZip] = useState<string>("");

  // --- Analyzing state ---
  const [analyzing, setAnalyzing] = useState(false);
  const [, setSessionId] = useState<string | null>(null);

  // --- Step 3: items ---
  const [items, setItems] = useState<EnrichedLineItem[]>([]);

  // --- Step 4: finalize ---
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [contractMessage, setContractMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<"draft" | "send" | null>(null);

  // --- On mount: load clients + quota ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [clientsRes, quotaRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/ai-estimates/analyze"),
        ]);
        if (clientsRes.ok && mounted) {
          setClients(await clientsRes.json());
        }
        if (quotaRes.ok && mounted) {
          const data = (await quotaRes.json()) as { quota: QuotaStatus };
          setQuotaWarning(data.quota);
        }
      } catch {
        // Non-fatal — user can still proceed; analyze endpoint will re-check.
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Revoke object URLs when component unmounts.
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  // --- Step 1 handlers ---
  const onFilesChosen = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setGlobalError(null);

      const incoming = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
      const allowed = Math.max(0, MAX_PHOTOS - photos.length);
      if (allowed === 0) {
        setGlobalError(`You can attach at most ${MAX_PHOTOS} photos.`);
        return;
      }

      const next: CapturedPhoto[] = [];
      for (const f of incoming.slice(0, allowed)) {
        try {
          const blob = await resizeImage(f);
          next.push({
            blob,
            previewUrl: URL.createObjectURL(blob),
            filename: f.name,
          });
        } catch {
          // If resize fails, attach the original.
          next.push({
            blob: f,
            previewUrl: URL.createObjectURL(f),
            filename: f.name,
          });
        }
      }
      setPhotos((prev) => [...prev, ...next]);
    },
    [photos.length],
  );

  function removePhoto(idx: number) {
    setPhotos((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  // --- Analyze (step 2 -> 3) ---
  async function runAnalyze() {
    if (photos.length === 0) {
      setGlobalError("Add at least one photo first.");
      return;
    }
    setAnalyzing(true);
    setGlobalError(null);

    try {
      const fd = new FormData();
      photos.forEach((p, i) => {
        // Ensure a filename + extension so the server can derive the path.
        const ext = p.blob.type === "image/webp" ? "webp" : "jpg";
        fd.append("photos", p.blob, `photo-${i}.${ext}`);
      });

      const context = {
        trade,
        sqft: numOrUndef(sqft),
        labor_hours: numOrUndef(laborHours),
        labor_rate: numOrUndef(laborRate),
        markup_pct: numOrUndef(markupPct),
        notes: notes.trim() || undefined,
        region_zip: regionZip.trim() || undefined,
        client_id: clientId || undefined,
      };
      fd.append("context", JSON.stringify(context));

      const res = await fetch("/api/ai-estimates/analyze", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ApiErrorBody;
        const code = body?.error?.code;
        if (code === "quota_exceeded" && body?.error?.quota) {
          setQuotaWarning(body.error.quota);
        }
        throw new Error(body?.error?.message ?? `Analysis failed (HTTP ${res.status})`);
      }

      const data = (await res.json()) as AnalyzeResponse;
      setSessionId(data.sessionId);
      setItems(data.detectedItems);
      setQuotaWarning(data.quota);
      setStep("Review");
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  // --- Step 3 helpers ---
  function updateItem<K extends keyof EnrichedLineItem>(
    idx: number,
    key: K,
    value: EnrichedLineItem[K],
  ) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, [key]: value } as EnrichedLineItem;
        next.total = round2(Number(next.quantity || 0) * Number(next.unit_price || 0));
        return next;
      }),
    );
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addBlankItem() {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        category: "other",
        quantity: 1,
        unit: "ea",
        confidence: 1,
        unit_price: 0,
        total: 0,
        source: "manual",
      },
    ]);
  }

  async function saveItemToCatalog(idx: number) {
    const it = items[idx];
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: it.description,
          category: it.category,
          unit: it.unit,
          default_price: it.unit_price,
          is_active: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      const created = await res.json();
      // Flip source so the badge updates immediately.
      setItems((prev) =>
        prev.map((row, i) =>
          i === idx ? { ...row, source: "catalog", matched_material_id: created.id } : row,
        ),
      );
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Could not save to catalog.");
    }
  }

  // --- Step 4 submit ---
  async function submitEstimate(send: boolean) {
    if (!clientId) {
      setGlobalError("Pick a client before saving.");
      return;
    }
    setSubmitting(send ? "send" : "draft");
    setGlobalError(null);
    try {
      const lineItems = items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity || 0),
        unit: it.unit || "ea",
        unit_price: Number(it.unit_price || 0),
        material_id: it.matched_material_id,
      }));

      // Append labor line if context supplied it.
      const laborH = numOrUndef(laborHours);
      const laborR = numOrUndef(laborRate);
      if (laborH && laborR) {
        lineItems.push({
          description: `Labor (${laborH} hrs)`,
          quantity: laborH,
          unit: "hr",
          unit_price: laborR,
          material_id: undefined,
        });
      }

      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          lineItems,
          contract_message: contractMessage || null,
          send,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create estimate");
      const created = await res.json();

      // Analytics hook. No analytics layer is wired up yet in this app —
      // when one is added (Posthog/Segment/Plausible) replace this with the
      // proper track() call. Today it just shows up in browser devtools so
      // we can verify the flow during smoke testing.
      // eslint-disable-next-line no-console
      console.info("[ai-estimate] converted", {
        estimateId: created.id,
        send,
        itemCount: items.length,
        total: grandTotal,
        catalogMatches: items.filter((i) => i.source === "catalog").length,
      });

      router.push(`/estimates/${created.id}?from_ai=1`);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : "Failed to save estimate.");
    } finally {
      setSubmitting(null);
    }
  }

  // --- Derived totals ---
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.total || 0), 0),
    [items],
  );
  const laborCost = useMemo(() => {
    const h = numOrUndef(laborHours);
    const r = numOrUndef(laborRate);
    return h && r ? h * r : 0;
  }, [laborHours, laborRate]);
  const taxable = subtotal + laborCost;
  const tax = round2(taxable * 0.13);
  const grandTotal = round2(taxable + tax);

  // --- Render ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/estimates">
              <Button variant="ghost" size="sm" className="-ml-2">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-teal-600" />
              AI Estimate
            </h1>
          </div>
          {quotaWarning && (
            <div className="text-xs text-gray-500 hidden sm:block">
              {Number.isFinite(quotaWarning.cap)
                ? `${quotaWarning.used} / ${quotaWarning.cap} used this month`
                : "Unlimited this month"}
            </div>
          )}
        </div>

        {/* Step indicator */}
        <ol className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
          {STEPS.map((s, i) => {
            const isActive = s === step;
            const isDone = STEPS.indexOf(step) > i;
            return (
              <li key={s} className="flex-1 flex items-center gap-1 sm:gap-2">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
                    isActive
                      ? "bg-teal-600 text-white"
                      : isDone
                      ? "bg-teal-100 text-teal-700"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`whitespace-nowrap ${
                    isActive ? "font-semibold text-gray-900" : "text-gray-500"
                  }`}
                >
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px bg-gray-200 mx-1" />
                )}
              </li>
            );
          })}
        </ol>

        {globalError && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        {/* Step content */}
        {step === "Capture" && (
          <CaptureStep
            photos={photos}
            onAdd={onFilesChosen}
            onRemove={removePhoto}
          />
        )}

        {step === "Context" && (
          <ContextStep
            trade={trade}
            setTrade={setTrade}
            sqft={sqft}
            setSqft={setSqft}
            laborHours={laborHours}
            setLaborHours={setLaborHours}
            laborRate={laborRate}
            setLaborRate={setLaborRate}
            markupPct={markupPct}
            setMarkupPct={setMarkupPct}
            notes={notes}
            setNotes={setNotes}
            regionZip={regionZip}
            setRegionZip={setRegionZip}
          />
        )}

        {step === "Review" && (
          <ReviewStep
            items={items}
            updateItem={updateItem}
            removeItem={removeItem}
            addBlankItem={addBlankItem}
            saveToCatalog={saveItemToCatalog}
            subtotal={subtotal}
            laborCost={laborCost}
            tax={tax}
            grandTotal={grandTotal}
          />
        )}

        {step === "Finalize" && (
          <FinalizeStep
            clients={clients}
            clientId={clientId}
            setClientId={setClientId}
            contractMessage={contractMessage}
            setContractMessage={setContractMessage}
            grandTotal={grandTotal}
          />
        )}
      </div>

      {/* Sticky footer with primary nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {step !== "Capture" ? (
            <Button
              variant="outline"
              onClick={() => setStep(STEPS[STEPS.indexOf(step) - 1])}
              disabled={analyzing || submitting !== null}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step === "Capture" && (
            <Button
              onClick={() => setStep("Context")}
              disabled={photos.length === 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Next <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}

          {step === "Context" && (
            <Button
              onClick={runAnalyze}
              disabled={analyzing || photos.length === 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Analyzing photos…
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-1.5" /> Analyze with AI
                </>
              )}
            </Button>
          )}

          {step === "Review" && (
            <Button
              onClick={() => setStep("Finalize")}
              disabled={items.length === 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Next <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}

          {step === "Finalize" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => submitEstimate(false)}
                disabled={submitting !== null || !clientId}
              >
                {submitting === "draft" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save draft"
                )}
              </Button>
              <Button
                onClick={() => submitEstimate(true)}
                disabled={submitting !== null || !clientId}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {submitting === "send" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save & send"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// Step 1: Capture
// =========================================================================

function CaptureStep({
  photos,
  onAdd,
  onRemove,
}: {
  photos: CapturedPhoto[];
  onAdd: (files: FileList | null) => void;
  onRemove: (idx: number) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add photos</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Up to {MAX_PHOTOS}. The clearer and more focused, the better the AI does.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 border-dashed"
            onClick={() => cameraRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
          >
            <Camera className="h-6 w-6 text-teal-600" />
            <span>Take photo</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2 border-dashed"
            onClick={() => galleryRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
          >
            <ImageIcon className="h-6 w-6 text-teal-600" />
            <span>Upload</span>
          </Button>
        </div>

        {/* Thumbnails */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div
                key={p.previewUrl}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => onRemove(i)}
                  className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <>
            <div className="rounded-md bg-teal-50 border border-teal-100 p-3 text-sm text-teal-800 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Tip: shoot the area straight-on with good light. Close-ups of any
                hardware (fixtures, fittings, panels) help the AI identify exact specs.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                // Fetches a curated sample photo for first-time users.
                // Drop a JPEG at public/sample-ai-estimate.jpg to enable.
                try {
                  const res = await fetch("/sample-ai-estimate.jpg");
                  if (!res.ok) throw new Error("sample not available");
                  const blob = await res.blob();
                  const file = new File([blob], "sample.jpg", { type: blob.type || "image/jpeg" });
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  onAdd(dt.files);
                } catch {
                  // Soft-fail: this is just a convenience affordance.
                }
              }}
              className="text-sm text-teal-700 hover:text-teal-800 underline"
            >
              Or try it with a sample photo
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Step 2: Context
// =========================================================================

function ContextStep(props: {
  trade: Trade;
  setTrade: (t: Trade) => void;
  sqft: string;
  setSqft: (s: string) => void;
  laborHours: string;
  setLaborHours: (s: string) => void;
  laborRate: string;
  setLaborRate: (s: string) => void;
  markupPct: string;
  setMarkupPct: (s: string) => void;
  notes: string;
  setNotes: (s: string) => void;
  regionZip: string;
  setRegionZip: (s: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add context</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          All fields optional. Better context = better estimate.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="trade">Trade</Label>
          <Select value={props.trade} onValueChange={(v) => props.setTrade(v as Trade)}>
            <SelectTrigger id="trade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRADE_OPTIONS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="sqft">Area (sqft)</Label>
            <Input
              id="sqft"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 120"
              value={props.sqft}
              onChange={(e) => props.setSqft(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip">ZIP code</Label>
            <Input
              id="zip"
              placeholder="e.g. 90210"
              value={props.regionZip}
              onChange={(e) => props.setRegionZip(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="hours">Labor hours</Label>
            <Input
              id="hours"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 8"
              value={props.laborHours}
              onChange={(e) => props.setLaborHours(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate">Labor rate ($/hr)</Label>
            <Input
              id="rate"
              type="number"
              inputMode="decimal"
              placeholder="e.g. 65"
              value={props.laborRate}
              onChange={(e) => props.setLaborRate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="markup">Markup on materials (%)</Label>
          <Input
            id="markup"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 20 for +20%"
            value={props.markupPct}
            onChange={(e) => props.setMarkupPct(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes for the AI</Label>
          <Textarea
            id="notes"
            placeholder="Anything else the AI should know — e.g. 'client wants brass fittings', 'existing drywall stays'"
            value={props.notes}
            onChange={(e) => props.setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Step 3: Review
// =========================================================================

function ReviewStep({
  items,
  updateItem,
  removeItem,
  addBlankItem,
  saveToCatalog,
  subtotal,
  laborCost,
  tax,
  grandTotal,
}: {
  items: EnrichedLineItem[];
  updateItem: <K extends keyof EnrichedLineItem>(
    idx: number,
    key: K,
    value: EnrichedLineItem[K],
  ) => void;
  removeItem: (idx: number) => void;
  addBlankItem: () => void;
  saveToCatalog: (idx: number) => void;
  subtotal: number;
  laborCost: number;
  tax: number;
  grandTotal: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Review line items</CardTitle>
          <Button variant="outline" size="sm" onClick={addBlankItem}>
            <Plus className="h-4 w-4 mr-1" /> Add row
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Edit anything you need. Green badges came from your catalog; amber are
          AI suggestions you should double-check.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            The AI didn&apos;t identify any items. Add rows manually or retake photos.
          </p>
        ) : (
          items.map((it, idx) => (
            <ItemRow
              key={idx}
              item={it}
              onChange={(k, v) => updateItem(idx, k, v)}
              onRemove={() => removeItem(idx)}
              onSaveToCatalog={() => saveToCatalog(idx)}
            />
          ))
        )}

        <div className="pt-4 border-t space-y-1 text-sm">
          <Row label="Materials subtotal" value={fmt(subtotal)} />
          {laborCost > 0 && <Row label="Labor" value={fmt(laborCost)} />}
          <Row label="Tax (13%)" value={fmt(tax)} />
          <Row
            label={<span className="font-semibold">Total</span>}
            value={<span className="font-semibold text-teal-700">{fmt(grandTotal)}</span>}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ItemRow({
  item,
  onChange,
  onRemove,
  onSaveToCatalog,
}: {
  item: EnrichedLineItem;
  onChange: <K extends keyof EnrichedLineItem>(key: K, value: EnrichedLineItem[K]) => void;
  onRemove: () => void;
  onSaveToCatalog: () => void;
}) {
  const isCatalog = item.source === "catalog";
  const isAi = item.source === "ai_suggested";

  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-2 bg-white">
      <div className="flex items-start justify-between gap-2">
        <Input
          aria-label="Description"
          value={item.description}
          onChange={(e) => onChange("description", e.target.value)}
          className="flex-1 font-medium"
          placeholder="Item description"
        />
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-600 h-9 w-9 flex items-center justify-center"
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 text-sm">
        <div>
          <Label className="text-xs text-gray-500">Qty</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={item.quantity}
            onChange={(e) => onChange("quantity", Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Unit</Label>
          <Input
            value={item.unit}
            onChange={(e) => onChange("unit", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Price</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={item.unit_price}
            onChange={(e) => onChange("unit_price", Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-500">Total</Label>
          <div className="h-9 px-3 flex items-center text-sm font-medium text-gray-900">
            {fmt(item.total)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
        {isCatalog && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
            <Check className="h-3 w-3" /> From your catalog
          </span>
        )}
        {isAi && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-amber-200">
            <Sparkles className="h-3 w-3" />
            AI suggested
            {item.suggested_low !== undefined && item.suggested_high !== undefined && (
              <span className="ml-1 text-amber-600">
                ({fmt(item.suggested_low)}–{fmt(item.suggested_high)})
              </span>
            )}
          </span>
        )}
        {item.source === "manual" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600 ring-1 ring-gray-200">
            Manual
          </span>
        )}
        {item.confidence < 0.6 && isAi && (
          <span className="text-amber-600">Low confidence — verify in person</span>
        )}
        {!isCatalog && item.description.trim() !== "" && (
          <button
            onClick={onSaveToCatalog}
            className="ml-auto text-teal-700 hover:text-teal-800 font-medium"
          >
            Save to my catalog
          </button>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Step 4: Finalize
// =========================================================================

function FinalizeStep({
  clients,
  clientId,
  setClientId,
  contractMessage,
  setContractMessage,
  grandTotal,
}: {
  clients: Client[];
  clientId: string;
  setClientId: (id: string) => void;
  contractMessage: string;
  setContractMessage: (s: string) => void;
  grandTotal: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Send to a client</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client">Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger id="client">
              <SelectValue placeholder="Pick a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.email ? ` — ${c.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {clients.length === 0 && (
            <p className="text-xs text-gray-500">
              No clients yet.{" "}
              <Link href="/clients/new" className="text-teal-700 underline">
                Add one
              </Link>
              .
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Contract message (optional)</Label>
          <Textarea
            id="message"
            value={contractMessage}
            onChange={(e) => setContractMessage(e.target.value)}
            rows={4}
            placeholder="Terms, scope of work, payment schedule…"
          />
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">Estimate total</span>
          <span className="text-xl font-semibold text-teal-700">{fmt(grandTotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// =========================================================================
// Helpers
// =========================================================================

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-600">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(n) ? n : 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function numOrUndef(s: string): number | undefined {
  if (!s || !s.trim()) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}
