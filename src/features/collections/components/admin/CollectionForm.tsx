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
import { DocumentType, gql } from "@/gql";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageDialog } from "@/features/medias";

const CollectionFromFragment = gql(/* GraphQL */ `
  fragment CollectionFromFragment on collections {
    id
    slug
    label
    description
    title
    featured_image_id
  }
`);

const collectionFormSchema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
  description: z.string().trim().min(1, "Description is required."),
  featuredImageId: z.string().trim().min(1, "Category image is required."),
});

type CollectionFormValues = z.infer<typeof collectionFormSchema>;

type CollectionFormProps = {
  collection?: DocumentType<typeof CollectionFromFragment>;
};

function CollectionForm({ collection }: CollectionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      name: collection?.label || collection?.title || "",
      description: collection?.description || "",
      featuredImageId: collection?.featured_image_id || "",
    },
  });

  const { register, control, handleSubmit } = form;

  const onSubmit = handleSubmit(async (data: CollectionFormValues) => {
    setIsPending(true);
    try {
      const payload = {
        name: data.name.trim(),
        description: data.description,
        featuredImageId: data.featuredImageId,
      };

      if (collection) {
        const res = await fetchWithTimeout("/api/admin/collections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: collection.id, ...payload }),
        });

        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(err?.message || "Failed to update category.");
        }

        router.replace("/admin/collections");
        router.refresh();
        toast({ title: "Category updated successfully." });
        return;
      }

      const res = await fetchWithTimeout("/api/admin/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(err?.message || "Failed to create category.");
      }

      router.replace("/admin/collections");
      router.refresh();
      toast({ title: "Category created successfully." });
    } catch (error) {
      toast({
        title: "Unable to save category",
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
        id="project-form"
        className="gap-x-5 flex gap-y-5 flex-col px-3"
        onSubmit={onSubmit}
      >
        <div className="flex flex-col gap-y-5 max-w-[500px]">
          <FormItem>
            <FormLabel className="text-sm">Category name*</FormLabel>
            <FormControl>
              <Input
                aria-invalid={!!form.formState.errors.name}
                placeholder="e.g. Silk Sarees"
                {...register("name")}
              />
            </FormControl>
            <FormDescription>
              Shown on the storefront as the category name. The URL is created
              automatically when you first save.
            </FormDescription>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel className="text-sm">Description*</FormLabel>
            <FormControl>
              <Textarea
                aria-invalid={!!form.formState.errors.description}
                placeholder="Short description for this category."
                {...register("description")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormField
            control={form.control}
            name="featuredImageId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category image*</FormLabel>
                <Suspense>
                  <div className="">
                    <ImageDialog
                      defaultValue={collection?.featured_image_id}
                      onChange={field.onChange}
                      value={field.value}
                      selectLabel="Select category image"
                      changeLabel="Change category image"
                    />
                  </div>
                </Suspense>

                <FormDescription>
                  Click the button to choose an image from the media library or
                  upload a new one.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="py-8 flex gap-x-5 items-center">
          <Button disabled={isPending} variant={"outline"} form="project-form">
            {collection ? "Update" : "Create"}
            {isPending && (
              <Spinner
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            )}
          </Button>
          <Link href="/admin/collections" className={buttonVariants()}>
            Cancel
          </Link>
        </div>
      </form>
    </Form>
  );
}

export default CollectionForm;
