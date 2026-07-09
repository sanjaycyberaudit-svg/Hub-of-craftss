"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  AdminLoadingState,
  LoadingButtonLabel,
} from "@/components/admin/AdminLoadingState";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";

type ApiSettingRecord = {
  key: string;
  isEnabled: boolean;
  value: Record<string, unknown>;
} | null;

type IntegrationsPayload = {
  offerCodes: ApiSettingRecord;
};

type OfferFormItem = {
  code: string;
  percentage: number;
  enabled: boolean;
};

type FormState = {
  enabled: boolean;
  codes: OfferFormItem[];
};

const DEFAULT_FORM: FormState = {
  enabled: true,
  codes: [{ code: "", percentage: 10, enabled: true }],
};

function normalizeCode(raw: string) {
  return raw.toUpperCase().replace(/\s+/g, "");
}

function parsePercentageInput(raw: string) {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(90, Math.max(0, Math.round(parsed)));
}

export function OfferCodesForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetchWithTimeout("/api/admin/integrations", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not load offer code settings");
        const payload = (await response.json()) as IntegrationsPayload;
        if (cancelled) return;

        const value = payload.offerCodes?.value ?? {};
        const rawCodes = Array.isArray(value.codes) ? value.codes : [];
        const parsed = rawCodes
          .map((entry) => {
            const item = entry as Record<string, unknown>;
            const code = normalizeCode(String(item.code ?? ""));
            if (!code) return null;
            const percentageRaw = Number(item.percentage ?? 10);
            return {
              code,
              percentage: Number.isFinite(percentageRaw)
                ? Math.min(90, Math.max(1, Math.round(percentageRaw)))
                : 10,
              enabled: Boolean(item.enabled ?? true),
            } satisfies OfferFormItem;
          })
          .filter((item): item is OfferFormItem => Boolean(item));

        setForm({
          enabled: payload.offerCodes?.isEnabled ?? true,
          codes: parsed.length > 0 ? parsed : DEFAULT_FORM.codes,
        });
      } catch (error) {
        toast({
          title: "Could not load offer codes",
          description: error instanceof Error ? error.message : "Please retry.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const disabled = useMemo(() => isLoading || isSaving, [isLoading, isSaving]);

  const updateCode = <K extends keyof OfferFormItem>(
    index: number,
    key: K,
    value: OfferFormItem[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      codes: prev.codes.map((code, i) =>
        i === index ? { ...code, [key]: value } : code,
      ),
    }));
  };

  const addCode = () => {
    setForm((prev) => ({
      ...prev,
      codes: [...prev.codes, { code: "", percentage: 10, enabled: true }],
    }));
  };

  const removeCode = (index: number) => {
    setForm((prev) => {
      if (prev.codes.length <= 1) return prev;
      return { ...prev, codes: prev.codes.filter((_, i) => i !== index) };
    });
  };

  const onSave = async () => {
    setIsSaving(true);
    try {
      const dedup = new Map<string, OfferFormItem>();
      form.codes.forEach((item) => {
        const code = normalizeCode(item.code);
        if (!code) return;
        if (!Number.isFinite(item.percentage) || item.percentage < 1) {
          throw new Error(`Discount for ${code} must be at least 1%.`);
        }
        dedup.set(code, {
          code,
          percentage: Math.min(90, Math.max(1, Math.round(item.percentage))),
          enabled: item.enabled,
        });
      });

      if (dedup.size === 0) {
        throw new Error("Add at least one valid offer code.");
      }

      const response = await fetchWithTimeout("/api/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "offer_codes",
          isEnabled: form.enabled,
          value: {
            codes: Array.from(dedup.values()),
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Save failed");
        throw new Error(text || "Save failed");
      }

      toast({
        title: "Offer codes saved",
        description: "Promo code discounts are now active in checkout.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offer Codes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <AdminLoadingState message="Loading offer codes..." />
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, enabled: event.target.checked }))
            }
          />
          Enable promo code discounts in checkout
        </label>

        <div className="space-y-3">
          {form.codes.map((item, index) => (
            <div key={index} className="rounded-md border p-3">
              <div className="grid gap-3 md:grid-cols-[1.2fr,0.8fr,0.8fr,auto]">
                <div className="space-y-1">
                  <Label htmlFor={`offer-code-${index}`}>Code</Label>
                  <Input
                    id={`offer-code-${index}`}
                    value={item.code}
                    onChange={(event) =>
                      updateCode(
                        index,
                        "code",
                        normalizeCode(event.target.value),
                      )
                    }
                    placeholder="WELCOME10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`offer-pct-${index}`}>Discount %</Label>
                  <Input
                    id={`offer-pct-${index}`}
                    type="text"
                    inputMode="numeric"
                    min={1}
                    max={90}
                    value={item.percentage === 0 ? "" : item.percentage}
                    onChange={(event) =>
                      updateCode(
                        index,
                        "percentage",
                        parsePercentageInput(event.target.value),
                      )
                    }
                    onBlur={() =>
                      updateCode(
                        index,
                        "percentage",
                        Math.min(90, Math.max(1, Number(item.percentage) || 1)),
                      )
                    }
                    placeholder="5"
                  />
                </div>
                <label className="flex items-end gap-2 text-sm pb-2">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) =>
                      updateCode(index, "enabled", event.target.checked)
                    }
                  />
                  Active
                </label>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => removeCode(index)}
                    disabled={form.codes.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={addCode}>
            Add code
          </Button>
          <Button onClick={onSave} disabled={disabled}>
            <LoadingButtonLabel
              isLoading={isSaving}
              loadingText="Saving..."
              idleText="Save offer codes"
            />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default OfferCodesForm;
