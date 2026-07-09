"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createShippingAddress,
  deleteUserAddress,
  setDefaultUserAddress,
  updateUserAddress,
} from "@/_actions/address";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { UserAddressRecord } from "../lib/userAddress";
import { userAddressToFormValues } from "../lib/userAddress";
import type { AddressFormValues } from "../validations/addressFormSchema";
import { AddressCard } from "./AddressCard";
import { AddAddressDialog } from "./AddAddressDialog";

type Props = {
  addresses: UserAddressRecord[];
  accountDefaults?: Partial<AddressFormValues>;
};

type DialogMode = "add" | "edit" | null;

export function AddressSettingsPanel({ addresses, accountDefaults }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const editingAddress = useMemo(
    () => addresses.find((item) => item.addressId === editingId) ?? null,
    [addresses, editingId],
  );

  const refresh = () => router.refresh();

  const handleAdd = async (values: AddressFormValues) => {
    setIsBusy(true);
    try {
      await createShippingAddress(values, undefined, {
        setAsDefault: addresses.length === 0,
      });
      toast({ title: "Address saved" });
      setDialogMode(null);
      refresh();
    } catch (err) {
      toast({
        title: "Could not save address",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsBusy(false);
    }
  };

  const handleEdit = async (values: AddressFormValues) => {
    if (!editingId) return;
    setIsBusy(true);
    try {
      await updateUserAddress(editingId, values);
      toast({ title: "Address updated" });
      setDialogMode(null);
      setEditingId(null);
      refresh();
    } catch (err) {
      toast({
        title: "Could not update address",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!window.confirm("Delete this address?")) return;
    setIsBusy(true);
    try {
      await deleteUserAddress(addressId);
      toast({ title: "Address deleted" });
      refresh();
    } catch (err) {
      toast({
        title: "Could not delete address",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setIsBusy(true);
    try {
      await setDefaultUserAddress(addressId);
      toast({ title: "Default address updated" });
      refresh();
    } catch (err) {
      toast({
        title: "Could not update default address",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium">Saved addresses</h3>
          <p className="text-sm text-muted-foreground">
            Manage delivery addresses for faster checkout.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingId(null);
            setDialogMode("add");
          }}
          disabled={isBusy}
        >
          Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No saved addresses yet. Add one to use at checkout.
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((item) => (
            <AddressCard
              key={item.addressId}
              address={item}
              showActions
              onEdit={() => {
                setEditingId(item.addressId);
                setDialogMode("edit");
              }}
              onDelete={() => handleDelete(item.addressId)}
              onSetDefault={
                item.isDefault
                  ? undefined
                  : () => handleSetDefault(item.addressId)
              }
            />
          ))}
        </div>
      )}

      <AddAddressDialog
        open={dialogMode === "add"}
        onOpenChange={(open) => {
          if (!open) setDialogMode(null);
        }}
        onSubmit={handleAdd}
        submitLabel="Save address"
        defaultValues={accountDefaults}
        title="Add new address"
      />

      <AddAddressDialog
        open={dialogMode === "edit" && Boolean(editingAddress)}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null);
            setEditingId(null);
          }
        }}
        onSubmit={handleEdit}
        submitLabel="Save changes"
        defaultValues={
          editingAddress
            ? userAddressToFormValues(editingAddress)
            : accountDefaults
        }
        title="Edit address"
      />
    </div>
  );
}
