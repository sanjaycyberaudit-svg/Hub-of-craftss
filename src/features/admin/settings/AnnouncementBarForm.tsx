"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDefaultAnnouncementLines } from "@/lib/announcements/defaults";
import type { StorefrontAnnouncement } from "@/lib/announcements/types";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import {
  AdminLoadingState,
  LoadingButtonLabel,
} from "@/components/admin/AdminLoadingState";

type ApiSettingRecord = {
  key: string;
  isEnabled: boolean;
  value: Record<string, unknown>;
} | null;

type IntegrationsPayload = {
  announcementBar: ApiSettingRecord;
};

type LineForm = StorefrontAnnouncement;

type FormState = {
  enabled: boolean;
  lines: LineForm[];
};

const createDefaultLine = (index: number): LineForm => ({
  id: `line-${index}`,
  text: "",
  href: "/shop",
  cta: "Shop now",
});

const DEFAULT_FORM: FormState = {
  enabled: true,
  lines: getDefaultAnnouncementLines(),
};

function normalizeLineForSave(line: LineForm, index: number) {
  const text = line.text.trim();
  return {
    id: line.id.trim() || `line-${index + 1}`,
    text,
    href: line.href.trim() || "/shop",
    cta: line.cta.trim() || "Shop now",
  };
}

export function AnnouncementBarForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetchWithTimeout("/api/admin/integrations", {
          cache: "no-store",
        });
        if (!res.ok)
          throw new Error("Could not load announcement bar settings");

        const payload = (await res.json()) as IntegrationsPayload;
        if (cancelled) return;

        const value = payload.announcementBar?.value ?? {};
        const inputLines = Array.isArray(value.announcements)
          ? value.announcements
          : [];
        const parsedLines = inputLines
          .map((line, index) => {
            const item = line as Record<string, unknown>;
            return {
              id: String(item.id ?? `line-${index + 1}`),
              text: String(item.text ?? ""),
              href: String(item.href ?? "/shop"),
              cta: String(item.cta ?? "Shop now"),
            } satisfies LineForm;
          })
          .filter((line) => line.id.trim().length > 0);

        setForm({
          enabled: payload.announcementBar?.isEnabled ?? true,
          lines:
            parsedLines.length > 0
              ? parsedLines
              : getDefaultAnnouncementLines(),
        });
      } catch (error) {
        toast({
          title: "Could not load settings",
          description: error instanceof Error ? error.message : "Please retry",
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

  const saveDisabled = useMemo(
    () => isSaving || isLoading,
    [isSaving, isLoading],
  );

  const updateLine = <K extends keyof LineForm>(
    index: number,
    key: K,
    value: LineForm[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) =>
        i === index ? { ...line, [key]: value } : line,
      ),
    }));
  };

  const moveLine = (index: number, direction: "up" | "down") => {
    setForm((prev) => {
      const lines = [...prev.lines];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= lines.length) return prev;
      [lines[index], lines[targetIndex]] = [lines[targetIndex], lines[index]];
      return { ...prev, lines };
    });
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, createDefaultLine(prev.lines.length + 1)],
    }));
  };

  const removeLine = (index: number) => {
    setForm((prev) => {
      if (prev.lines.length <= 1) return prev;
      return { ...prev, lines: prev.lines.filter((_, i) => i !== index) };
    });
  };

  const onSave = async () => {
    setIsSaving(true);
    try {
      const announcements = form.lines.map(normalizeLineForSave);
      const emptyLineIndex = announcements.findIndex((line) => !line.text);
      if (emptyLineIndex >= 0) {
        throw new Error(
          `Line ${emptyLineIndex + 1} needs announcement text before saving.`,
        );
      }

      const res = await fetchWithTimeout("/api/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "announcement_bar",
          isEnabled: form.enabled,
          value: { announcements },
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(payload?.message || "Save failed");
      }

      toast({
        title: "Announcement bar saved",
        description: "Storefront top ribbon now uses the updated lines.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please retry",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Top Announcement Ribbon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <AdminLoadingState message="Loading announcement bar..." />
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, enabled: e.target.checked }))
              }
            />
            Show announcement bar on storefront
          </label>
          <p className="text-xs text-muted-foreground">
            Existing default lines are pre-filled below. Add new lines, edit
            text, CTA, and links, then reorder as needed.
          </p>
        </CardContent>
      </Card>

      {form.lines.map((line, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-base">Line {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => moveLine(index, "up")}
                disabled={index === 0}
              >
                Move Up
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => moveLine(index, "down")}
                disabled={index === form.lines.length - 1}
              >
                Move Down
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => removeLine(index)}
                disabled={form.lines.length <= 1}
              >
                Remove
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`announcement-id-${index}`}>Line ID</Label>
              <Input
                id={`announcement-id-${index}`}
                value={line.id}
                onChange={(e) => updateLine(index, "id", e.target.value)}
                placeholder="festive-offer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`announcement-text-${index}`}>
                Announcement text*
              </Label>
              <Input
                id={`announcement-text-${index}`}
                value={line.text}
                onChange={(e) => updateLine(index, "text", e.target.value)}
                placeholder="Premium silk & cotton sarees — wholesale & retail"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`announcement-cta-${index}`}>CTA label*</Label>
              <Input
                id={`announcement-cta-${index}`}
                value={line.cta}
                onChange={(e) => updateLine(index, "cta", e.target.value)}
                placeholder="Shop now"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`announcement-href-${index}`}>Link*</Label>
              <Input
                id={`announcement-href-${index}`}
                value={line.href}
                onChange={(e) => updateLine(index, "href", e.target.value)}
                placeholder="/shop or tel:+917708069049"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={addLine}>
          Add line
        </Button>
        <Button onClick={onSave} disabled={saveDisabled}>
          <LoadingButtonLabel
            isLoading={isSaving}
            loadingText="Saving..."
            idleText="Save announcement bar"
          />
        </Button>
      </div>
    </div>
  );
}
