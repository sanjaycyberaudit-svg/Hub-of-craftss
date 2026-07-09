"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageDialog } from "@/features/medias";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import {
  buildBannerImageAlt,
  buildProductShopHref,
} from "@/lib/admin/home-banner-links";
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
  homeBannerSlides: ApiSettingRecord;
};

type SlideForm = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  imageAlt: string;
  imageMediaId: string;
  image: string;
  productId: string;
};

type BannerProductOption = {
  id: string;
  name: string;
  slug: string;
  productCode: string | null;
  href: string;
};

type FormState = {
  enabled: boolean;
  slides: SlideForm[];
};

const createDefaultSlide = (index: number): SlideForm => ({
  id: `slide-${index}`,
  title: "",
  subtitle: "",
  href: "/shop",
  cta: "Shop now",
  imageAlt: "",
  imageMediaId: "",
  image: "",
  productId: "",
});

const DEFAULT_FORM: FormState = {
  enabled: true,
  slides: [createDefaultSlide(1)],
};

const DEFAULT_SUBTITLE = "Discover our latest collections.";
const DEFAULT_TITLE_PREFIX = "Banner Slide";

function normalizeSlideForSave(slide: SlideForm, index: number) {
  const title = slide.title.trim() || `${DEFAULT_TITLE_PREFIX} ${index + 1}`;
  const subtitle = slide.subtitle.trim() || DEFAULT_SUBTITLE;
  const href = slide.href.trim() || "/shop";
  const cta = slide.cta.trim() || "Shop now";
  const imageAlt = buildBannerImageAlt(title, subtitle, index);

  return {
    id: slide.id.trim() || `slide-${index + 1}`,
    title,
    subtitle,
    href,
    cta,
    imageAlt,
    imageMediaId: slide.imageMediaId.trim(),
    image: slide.image.trim(),
    productId: slide.productId.trim(),
  };
}

export function HomeBannerForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [productOptions, setProductOptions] = useState<BannerProductOption[]>(
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        const res = await fetchWithTimeout(
          "/api/admin/products/banner-options",
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const payload = (await res.json()) as {
          products?: BannerProductOption[];
        };
        if (!cancelled) {
          setProductOptions(payload.products ?? []);
        }
      } catch {
        // Product list is optional for editing existing slides.
      }
    };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetchWithTimeout("/api/admin/integrations", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Could not load home banner settings");

        const payload = (await res.json()) as IntegrationsPayload;
        if (cancelled) return;

        const value = payload.homeBannerSlides?.value ?? {};
        const inputSlides = Array.isArray(value.slides) ? value.slides : [];
        const parsedSlides = inputSlides
          .map((slide, index) => {
            const item = slide as Record<string, unknown>;
            return {
              id: String(item.id ?? `slide-${index + 1}`),
              title: String(item.title ?? ""),
              subtitle: String(item.subtitle ?? ""),
              href: String(item.href ?? "/shop"),
              cta: String(item.cta ?? "Shop now"),
              imageAlt: String(item.imageAlt ?? ""),
              imageMediaId: String(item.imageMediaId ?? ""),
              image: String(item.image ?? ""),
              productId: String(item.productId ?? ""),
            } satisfies SlideForm;
          })
          .filter((slide) => slide.id.trim().length > 0);

        setForm({
          enabled: payload.homeBannerSlides?.isEnabled ?? true,
          slides:
            parsedSlides.length > 0
              ? parsedSlides.map((slide, index) => ({
                  ...slide,
                  imageAlt: buildBannerImageAlt(
                    slide.title,
                    slide.subtitle,
                    index,
                  ),
                }))
              : [createDefaultSlide(1)],
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

  const updateSlide = <K extends keyof SlideForm>(
    index: number,
    key: K,
    value: SlideForm[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, i) => {
        if (i !== index) return slide;
        const next = { ...slide, [key]: value };
        if (key === "title" || key === "subtitle") {
          next.imageAlt = buildBannerImageAlt(
            key === "title" ? String(value) : next.title,
            key === "subtitle" ? String(value) : next.subtitle,
            index,
          );
        }
        return next;
      }),
    }));
  };

  const selectBannerProduct = (index: number, productId: string) => {
    const product = productOptions.find((item) => item.id === productId);
    setForm((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, i) => {
        if (i !== index) return slide;
        if (!productId || !product) {
          return { ...slide, productId: "" };
        }
        return {
          ...slide,
          productId: product.id,
          href: product.href || buildProductShopHref(product.slug),
        };
      }),
    }));
  };

  const moveSlide = (index: number, direction: "up" | "down") => {
    setForm((prev) => {
      const slides = [...prev.slides];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= slides.length) return prev;
      [slides[index], slides[targetIndex]] = [
        slides[targetIndex],
        slides[index],
      ];
      return { ...prev, slides };
    });
  };

  const addSlide = () => {
    setForm((prev) => ({
      ...prev,
      slides: [...prev.slides, createDefaultSlide(prev.slides.length + 1)],
    }));
  };

  const removeSlide = (index: number) => {
    setForm((prev) => {
      if (prev.slides.length <= 1) return prev;
      return { ...prev, slides: prev.slides.filter((_, i) => i !== index) };
    });
  };

  const onSave = async () => {
    setIsSaving(true);
    try {
      const slides = form.slides.map(normalizeSlideForSave);
      const slideWithoutImage = slides.findIndex(
        (slide) => !slide.imageMediaId && !slide.image,
      );
      if (slideWithoutImage >= 0) {
        throw new Error(
          `Slide ${slideWithoutImage + 1} needs an image (media or fallback URL).`,
        );
      }

      const res = await fetchWithTimeout("/api/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "home_banner_slides",
          isEnabled: form.enabled,
          value: { slides },
        }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          message?: string;
          error?: unknown;
        } | null;
        if (payload?.message) {
          throw new Error(payload.message);
        }
        throw new Error("Save failed");
      }

      toast({
        title: "Home banner saved",
        description: "Homepage carousel now uses the updated slide content.",
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
          <CardTitle>Homepage Banner Carousel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <AdminLoadingState message="Loading home banner..." />
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, enabled: e.target.checked }))
              }
            />
            Enable admin-managed home banner slides
          </label>
          <p className="text-xs text-muted-foreground">
            Current slides are shown below. Add, reorder, and update text or
            image per slide.
          </p>
        </CardContent>
      </Card>

      {form.slides.map((slide, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-base">Slide {index + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => moveSlide(index, "up")}
                disabled={index === 0}
              >
                Move Up
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => moveSlide(index, "down")}
                disabled={index === form.slides.length - 1}
              >
                Move Down
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => removeSlide(index)}
                disabled={form.slides.length <= 1}
              >
                Remove
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`slide-id-${index}`}>Slide ID</Label>
              <Input
                id={`slide-id-${index}`}
                value={slide.id}
                onChange={(e) => updateSlide(index, "id", e.target.value)}
                placeholder="festive-silk"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`slide-title-${index}`}>Heading</Label>
              <Input
                id={`slide-title-${index}`}
                value={slide.title}
                onChange={(e) => updateSlide(index, "title", e.target.value)}
                placeholder="Festive Silk"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`slide-subtitle-${index}`}>Subheading</Label>
              <Input
                id={`slide-subtitle-${index}`}
                value={slide.subtitle}
                onChange={(e) => updateSlide(index, "subtitle", e.target.value)}
                placeholder="Kanjivaram, soft silk, and wedding weaves..."
              />
            </div>

            <div className="grid gap-2">
              <Label>Slide image</Label>
              <ImageDialog
                value={slide.imageMediaId}
                defaultValue={slide.imageMediaId}
                onChange={(mediaId) =>
                  updateSlide(index, "imageMediaId", mediaId)
                }
                selectLabel="Select slide image"
                changeLabel="Change slide image"
              />
              <p className="text-xs text-muted-foreground">
                Image alt text is generated automatically from the heading and
                subheading.
              </p>
              {slide.imageAlt ? (
                <p className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  Alt text: {slide.imageAlt}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`slide-image-url-${index}`}>
                Slide image URL (fallback)
              </Label>
              <Input
                id={`slide-image-url-${index}`}
                value={slide.image}
                onChange={(e) => updateSlide(index, "image", e.target.value)}
                placeholder="https://.../banner-image.webp"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`slide-product-${index}`}>Shop product</Label>
              <Select
                value={slide.productId || "__none__"}
                onValueChange={(value) =>
                  selectBannerProduct(index, value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger id={`slide-product-${index}`}>
                  <SelectValue placeholder="Select a published product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    Custom link (no product)
                  </SelectItem>
                  {productOptions.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.productCode
                        ? `${product.productCode} — ${product.name}`
                        : product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Recommended: pick the saree this banner sells. The Shop button
                and banner tap open that product page directly.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`slide-cta-${index}`}>Button Text</Label>
              <Input
                id={`slide-cta-${index}`}
                value={slide.cta}
                onChange={(e) => updateSlide(index, "cta", e.target.value)}
                placeholder="Shop now"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`slide-href-${index}`}>
                {slide.productId ? "Product page link" : "Button Link"}
              </Label>
              <Input
                id={`slide-href-${index}`}
                value={slide.href}
                onChange={(e) => updateSlide(index, "href", e.target.value)}
                placeholder="/shop/product-slug"
                readOnly={Boolean(slide.productId)}
              />
              {slide.productId ? (
                <p className="text-xs text-emerald-700">
                  Linked to product — customers go straight to buy this item.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Use a collection path or `/shop/your-product-slug` for a
                  custom destination.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={addSlide}>
          Add Slide
        </Button>
        <Button onClick={onSave} disabled={saveDisabled}>
          <LoadingButtonLabel
            isLoading={isSaving}
            loadingText="Saving..."
            idleText="Save home banner"
          />
        </Button>
      </div>
    </div>
  );
}
