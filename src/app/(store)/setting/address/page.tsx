import { AddressSettingsPanel } from "@/features/addresses";
import { listUserAddresses } from "@/_actions/address";
import { getSessionUser } from "@/lib/auth/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function AddressSettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  const addresses = await listUserAddresses();
  const accountDefaults = {
    email: user.email ?? "",
    fullName: (user.user_metadata?.full_name as string | undefined) ?? "",
  };

  return (
    <AddressSettingsPanel
      addresses={addresses}
      accountDefaults={accountDefaults}
    />
  );
}

export default AddressSettingsPage;
