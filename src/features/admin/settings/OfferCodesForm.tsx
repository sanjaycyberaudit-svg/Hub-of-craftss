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
  commonEnabled: boolean;
  welcomeOffer: OfferFormItem;
  codes: OfferFormItem[];
};

const DEFAULT_FORM: FormState = {
  commonEnabled: true,
  welcomeOffer: { code: "", percentage: 10, enabled: false },
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
        const hasDedicatedWelcome = Object.prototype.hasOwnProperty.call(
          value,
          "welcomeOffer",
        );
        const rawWelcome = (value.welcomeOffer ?? {}) as Record<
          string,
          unknown
        >;
        const legacyWelcomeIndex = hasDedicatedWelcome
          ? -1
          : parsed.findIndex((item) => item.enabled);
        const legacyWelcome =
          legacyWelcomeIndex >= 0 ? parsed[legacyWelcomeIndex] : null;
        const welcomeOffer = hasDedicatedWelcome
          ? {
              code: normalizeCode(String(rawWelcome.code ?? "")),
              percentage: Math.min(
                90,
                Math.max(1, Math.round(Number(rawWelcome.percentage) || 10)),
              ),
              enabled: Boolean(rawWelcome.enabled),
            }
          : legacyWelcome ?? DEFAULT_FORM.welcomeOffer;
        const commonCodes = parsed.filter(
          (item, index) =>
            index !== legacyWelcomeIndex && item.code !== welcomeOffer.code,
        );

        setForm({
          commonEnabled: payload.offerCodes?.isEnabled ?? true,
          welcomeOffer,
          codes: commonCodes.length > 0 ? commonCodes : DEFAULT_FORM.codes,
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
      const welcomeCode = normalizeCode(form.welcomeOffer.code);
      if (form.welcomeOffer.enabled && welcomeCode.length < 3) {
        throw new Error(
          "Add a popup offer code with at least 3 characters, or disable the popup.",
        );
      }
      if (
        !Number.isFinite(form.welcomeOffer.percentage) ||
        form.welcomeOffer.percentage < 1
      ) {
        throw new Error("Popup offer discount must be at least 1%.");
      }

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

      if (welcomeCode && dedup.has(welcomeCode)) {
        throw new Error(
          "Use different codes for the popup offer and common offers.",
        );
      }
      if (form.commonEnabled && dedup.size === 0) {
        throw new Error(
          "Add at least one common offer code, or disable common offers.",
        );
      }

      const response = await fetchWithTimeout("/api/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "offer_codes",
          isEnabled: form.commonEnabled,
          value: {
            welcomeOffer: {
              code: welcomeCode,
              percentage: Math.min(
                90,
                Math.max(1, Math.round(form.welcomeOffer.percentage)),
              ),
              enabled: form.welcomeOffer.enabled,
            },
            codes: Array.from(dedup.values()),
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "Save failed");
        throw new Error(text || "Save failed");
      }

      toast({
        title: "Offer settings saved",
        description: "Popup and common offer settings have been updated.",
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
        <section className="space-y-3 rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
          <div>
            <h3 className="font-semibold">Welcome popup offer</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Shown when visitors open the store. This dedicated code requires
              an account and is accepted only on the customer&apos;s first
              completed order.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.welcomeOffer.enabled}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  welcomeOffer: {
                    ...prev.welcomeOffer,
                    enabled: event.target.checked,
                  },
                }))
              }
            />
            Enable welcome offer popup
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="welcome-offer-code">Popup offer code</Label>
              <Input
                id="welcome-offer-code"
                value={form.welcomeOffer.code}
                disabled={!form.welcomeOffer.enabled}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    welcomeOffer: {
                      ...prev.welcomeOffer,
                      code: normalizeCode(event.target.value),
                    },
                  }))
                }
                placeholder="WELCOME10"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="welcome-offer-pct">Discount %</Label>
              <Input
                id="welcome-offer-pct"
                type="text"
                inputMode="numeric"
                disabled={!form.welcomeOffer.enabled}
                value={
                  form.welcomeOffer.percentage === 0
                    ? ""
                    : form.welcomeOffer.percentage
                }
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    welcomeOffer: {
                      ...prev.welcomeOffer,
                      percentage: parsePercentageInput(event.target.value),
                    },
                  }))
                }
                onBlur={() =>
                  setForm((prev) => ({
                    ...prev,
                    welcomeOffer: {
                      ...prev.welcomeOffer,
                      percentage: Math.min(
                        90,
                        Math.max(1, Number(prev.welcomeOffer.percentage) || 1),
                      ),
                    },
                  }))
                }
                placeholder="10"
              />
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <div>
            <h3 className="font-semibold">Common offer codes</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Normal checkout promotions. These are separate from the welcome
              popup and can be used on later orders.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.commonEnabled}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  commonEnabled: event.target.checked,
                }))
              }
            />
            Enable common offer codes
          </label>

          <div className="space-y-3">
            {form.codes.map((item, index) => (
              <div key={index} className="rounded-md border p-3">
                <div className="grid gap-3 md:grid-cols-[1.2fr,0.8fr,0.8fr,auto]">
                  <div className="space-y-1">
                    <Label htmlFor={`offer-code-${index}`}>Code</Label>
                    <Input
                      id={`offer-code-${index}`}
                      disabled={!form.commonEnabled}
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
                      disabled={!form.commonEnabled}
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
                          Math.min(
                            90,
                            Math.max(1, Number(item.percentage) || 1),
                          ),
                        )
                      }
                      placeholder="5"
                    />
                  </div>
                  <label className="flex items-end gap-2 text-sm pb-2">
                    <input
                      type="checkbox"
                      disabled={!form.commonEnabled}
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
                      disabled={!form.commonEnabled || form.codes.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={addCode}
            disabled={!form.commonEnabled}
          >
            Add common code
          </Button>
        </section>

        <div className="flex justify-end">
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
