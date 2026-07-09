"use client";

import { PhoneCall } from "lucide-react";
import { Icons } from "@/components/layouts/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStorefrontContact } from "@/providers/ShopContactProvider";
import { useBulkOrderGuardConfig } from "@/providers/BulkOrderGuardProvider";
import { useStorefrontSocial } from "@/providers/SocialLinksProvider";

type BulkOrderGuardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BulkOrderGuardDialog({
  open,
  onOpenChange,
}: BulkOrderGuardDialogProps) {
  const social = useStorefrontSocial();
  const contact = useStorefrontContact();
  const { threshold } = useBulkOrderGuardConfig();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk order verification required</DialogTitle>
          <DialogDescription className="space-y-2 pt-1 leading-relaxed text-left">
            <p>
              For {threshold}+ quantity, manufacturing/availability confirmation
              is required. Please call or WhatsApp us and verify before placing
              order.
            </p>
            <p lang="ta">
              {threshold} அல்லது அதற்கு மேற்பட்ட அளவு ஆர்டருக்கு, தயாரிப்பு /
              கிடைப்புத் தகவல் உறுதி அவசியம். ஆர்டர் வைக்கும் முன் தயவுசெய்து
              எங்களை அழைக்கவும் அல்லது WhatsApp மூலம் தொடர்பு கொண்டு
              உறுதிப்படுத்தவும்.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button asChild className="w-full bg-[#0EA5E9] hover:bg-[#0284C7]">
            <a href={contact.phoneHref}>
              <PhoneCall className="mr-2 h-4 w-4" />
              Call now
            </a>
          </Button>
          <Button
            asChild
            className="w-full bg-[#25D366] text-white hover:bg-[#1ea857]"
          >
            <a href={social.whatsapp} target="_blank" rel="noopener noreferrer">
              <Icons.whatsapp className="mr-2 h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default BulkOrderGuardDialog;
