"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  mergeCheckoutAddressDefaults,
  saveCheckoutAddressDraft,
} from "../lib/checkoutAddressDraft";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import CheckoutTermsNotice from "@/components/layouts/CheckoutTermsNotice";
import { cn } from "@/lib/utils";
import { calculateCourierCharge } from "@/lib/courier/calculate";
import { useCourierChargesConfig } from "@/providers/CourierChargesProvider";
import { INDIAN_STATES } from "../constants/indianStates";
import {
  addressFormSchema,
  type AddressFormValues,
} from "../validations/addressFormSchema";

type Props = {
  onSubmit: (values: AddressFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  submittingMessage?: string;
  defaultValues?: Partial<AddressFormValues>;
  /** Remember fields in localStorage until checkout completes (survives refresh). */
  persistDraft?: boolean;
  /** When the parent dialog opens, reload any saved draft. */
  dialogOpen?: boolean;
  checkoutQuantity?: number;
  disabled?: boolean;
};

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <span>
      {children}
      <span className="text-destructive" aria-hidden="true">
        {" "}
        *
      </span>
    </span>
  );
}

export function AddAddressForm({
  onSubmit,
  onCancel,
  submitLabel = "Add Address",
  submittingMessage = "Processing your details…",
  defaultValues,
  persistDraft = false,
  dialogOpen = true,
  checkoutQuantity = 1,
  disabled = false,
}: Props) {
  const courierConfig = useCourierChargesConfig();
  const initialValues = useMemo(
    () =>
      persistDraft
        ? mergeCheckoutAddressDefaults(defaultValues)
        : {
            fullName: "",
            email: "",
            mobile: "",
            line1: "",
            line2: "",
            city: "",
            state: "",
            postal_code: "",
            ...defaultValues,
          },
    [persistDraft, defaultValues],
  );

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: initialValues,
  });

  const isSubmitting = form.formState.isSubmitting || disabled;

  const wasDialogOpen = useRef(false);
  useEffect(() => {
    const justOpened = dialogOpen && !wasDialogOpen.current;
    wasDialogOpen.current = dialogOpen;

    if (!persistDraft || !justOpened) return;
    form.reset(mergeCheckoutAddressDefaults(defaultValues));
  }, [persistDraft, dialogOpen, defaultValues, form]);

  useEffect(() => {
    if (!persistDraft) return;

    const subscription = form.watch((values) => {
      saveCheckoutAddressDraft(values as AddressFormValues);
    });

    return () => subscription.unsubscribe();
  }, [form, persistDraft]);

  const selectedState = form.watch("state");
  const courierPreview = useMemo(() => {
    if (!courierConfig.enabled) return null;
    if (!selectedState?.trim()) return null;
    return calculateCourierCharge({
      state: selectedState,
      quantity: Math.max(1, Math.round(checkoutQuantity)),
      config: courierConfig,
    });
  }, [checkoutQuantity, courierConfig, selectedState]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 sm:space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <RequiredLabel>Full Name</RequiredLabel>
              </FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <RequiredLabel>Email</RequiredLabel>
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter email"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mobile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <RequiredLabel>Mobile Number</RequiredLabel>
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter mobile number"
                  autoComplete="tel"
                  maxLength={10}
                  {...field}
                  onChange={(e) => {
                    const digits = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    field.onChange(digits);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="line1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <RequiredLabel>Address</RequiredLabel>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter address"
                  autoComplete="street-address"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="line2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address Line 2</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <RequiredLabel>City</RequiredLabel>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter city"
                    autoComplete="address-level2"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <RequiredLabel>State</RequiredLabel>
                </FormLabel>
                <FormControl>
                  <select
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                      !field.value && "text-muted-foreground",
                    )}
                    value={field.value}
                    autoComplete="address-level1"
                    onChange={(event) => field.onChange(event.target.value)}
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <RequiredLabel>PIN Code</RequiredLabel>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="6-digit PIN code"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={6}
                    {...field}
                    onChange={(e) => {
                      const digits = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      field.onChange(digits);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {courierPreview ? (
          <div className="rounded-md border border-[#E8A317]/40 bg-[#FFF7E6] p-3 text-sm text-[#7a5200]">
            <p className="font-medium">
              Estimated courier charge: Rs {courierPreview.charge}
            </p>
            <p className="mt-1 text-xs">
              Based on state and {courierPreview.quantity} item(s). This is
              shown before payment so customers can confirm total cost.
            </p>
          </div>
        ) : null}

        <CheckoutTermsNotice />
        <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-2 sm:backdrop-blur-none sm:flex-row sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-full bg-[#E8A317] text-[#1a1a1a] hover:bg-[#d49210] sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                {submittingMessage}
                <Spinner className="ml-2 h-4 w-4" aria-hidden="true" />
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default AddAddressForm;
