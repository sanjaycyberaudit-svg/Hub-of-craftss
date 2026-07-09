"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { DocumentType } from "@/gql";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import { nanoid } from "nanoid";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageDialog } from "@/features/medias";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseVideoEmbed } from "../../lib/video";
import { TestimonialFormFragment } from "../../query";

const testimonialFormSchema = z
  .object({
    kind: z.enum(["text", "video"]),
    customerName: z.string().min(1, "Customer name is required"),
    location: z.string().optional(),
    quote: z.string().optional(),
    rating: z.coerce.number().min(1).max(5).default(5),
    videoUrl: z.string().optional(),
    featuredImageId: z.string().optional(),
    isPublished: z.boolean().default(true),
    order: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "text") {
      if (!data.quote?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Feedback text is required for text testimonials",
          path: ["quote"],
        });
      }
    }
    if (data.kind === "video") {
      if (!data.videoUrl?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Video URL is required for video testimonials",
          path: ["videoUrl"],
        });
      } else if (!parseVideoEmbed(data.videoUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Use a YouTube, Vimeo, or direct MP4/WebM link",
          path: ["videoUrl"],
        });
      }
    }
  });

type FormValues = z.infer<typeof testimonialFormSchema>;

type TestimonialFormProps = {
  testimonial?: DocumentType<typeof TestimonialFormFragment>;
};

function TestimonialForm({ testimonial }: TestimonialFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(testimonialFormSchema),
    defaultValues: {
      kind: (testimonial?.kind as "text" | "video") ?? "text",
      customerName: testimonial?.customer_name ?? "",
      location: testimonial?.location ?? "",
      quote: testimonial?.quote ?? "",
      rating: testimonial?.rating ?? 5,
      videoUrl: testimonial?.video_url ?? "",
      featuredImageId: testimonial?.featured_image_id ?? undefined,
      isPublished: testimonial?.is_published ?? true,
      order: testimonial?.order ?? 0,
    },
  });

  const kind = form.watch("kind");

  const { register, control, handleSubmit } = form;

  const onSubmit = handleSubmit(async (data) => {
    setIsPending(true);
    try {
      const payload = {
        kind: data.kind,
        customerName: data.customerName,
        location: data.location || null,
        quote: data.quote?.trim() || null,
        rating: data.rating ?? 5,
        videoUrl: data.kind === "video" ? data.videoUrl?.trim() || null : null,
        featuredImageId: data.featuredImageId || null,
        isPublished: data.isPublished ?? true,
        order: data.order ?? 0,
      };

      if (testimonial) {
        const res = await fetchWithTimeout("/api/admin/testimonials", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: testimonial.id, ...payload }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(err?.message || "Update failed");
        }

        router.push("/admin/testimonials");
        router.refresh();
        toast({ title: "Testimonial updated." });
      } else {
        const res = await fetchWithTimeout("/api/admin/testimonials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: nanoid(), ...payload }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(err?.message || "Create failed");
        }

        router.push("/admin/testimonials");
        router.refresh();
        toast({ title: "Testimonial created." });
      }
    } catch (error) {
      toast({
        title: testimonial ? "Update failed" : "Create failed",
        description: error instanceof Error ? error.message : "Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  });

  return (
    <Form {...form}>
      <form
        id="testimonial-form"
        className="flex flex-col gap-y-5 px-3"
        onSubmit={onSubmit}
      >
        <div className="flex max-w-[520px] flex-col gap-y-5">
          <FormField
            control={control}
            name="kind"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type*</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="text">Text review</SelectItem>
                    <SelectItem value="video">Video review</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Text uses a quote card; video loads only when the customer
                  taps play (fast on mobile).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel className="text-sm">Customer name*</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. Priya S."
                {...register("customerName")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel className="text-sm">Location</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Salem" {...register("location")} />
            </FormControl>
            <FormMessage />
          </FormItem>

          {kind === "text" ? (
            <FormItem>
              <FormLabel className="text-sm">Feedback*</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder="What did the customer say?"
                  {...register("quote")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          ) : (
            <FormItem>
              <FormLabel className="text-sm">Video URL*</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://youtube.com/watch?v=... or .mp4 link"
                  {...register("videoUrl")}
                />
              </FormControl>
              <FormDescription>
                YouTube, Vimeo, or direct MP4/WebM from your S3 media URL.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}

          {kind === "video" ? (
            <FormItem>
              <FormLabel className="text-sm">Caption (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Short line under the video"
                  {...register("quote")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          ) : null}

          <FormField
            control={control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating</FormLabel>
                <Select
                  value={String(field.value ?? 5)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Rating" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} stars
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel className="text-sm">Display order</FormLabel>
            <FormControl>
              <Input
                type="number"
                {...register("order", { valueAsNumber: true })}
              />
            </FormControl>
            <FormDescription>Higher numbers appear first.</FormDescription>
            <FormMessage />
          </FormItem>

          <FormField
            control={control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="font-normal">Show on homepage</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="featuredImageId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {kind === "video"
                    ? "Poster image (optional)"
                    : "Background image (optional)"}
                </FormLabel>
                <Suspense>
                  <ImageDialog
                    defaultValue={testimonial?.featured_image_id}
                    onChange={field.onChange}
                    value={field.value}
                    selectLabel={
                      kind === "video"
                        ? "Select poster image"
                        : "Select background image"
                    }
                    changeLabel={
                      kind === "video"
                        ? "Change poster image"
                        : "Change background image"
                    }
                  />
                </Suspense>
                <FormDescription>
                  {kind === "video"
                    ? "Shown before play. YouTube/Vimeo auto-thumbnail if empty."
                    : "Uses brand green gradient if empty."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-x-5 py-8">
          <Button
            disabled={isPending}
            variant="outline"
            form="testimonial-form"
          >
            {testimonial ? "Update" : "Create"}
            {isPending ? (
              <Spinner className="ml-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
          </Button>
          <Link href="/admin/testimonials" className={buttonVariants()}>
            Cancel
          </Link>
        </div>
      </form>
    </Form>
  );
}

export default TestimonialForm;
