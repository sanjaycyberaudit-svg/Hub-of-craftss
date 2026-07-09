"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";

type SizeOption = {
  size: string;
  qty: number;
};

type SizeConfigResponse = {
  enabled: boolean;
  options: SizeOption[];
};

function formatSizeLabel(option: SizeOption) {
  const size = String(option.size ?? "")
    .trim()
    .toUpperCase();
  const qty = Number(option.qty ?? 0);
  if (!size) return `${qty}`;
  if (/^[A-Z]+$/.test(size)) return `${size} : ${qty}`;
  return size;
}

export default function ProductSizePreview({
  productId,
}: {
  productId: string;
}) {
  const [data, setData] = useState<SizeConfigResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetchWithTimeout(
          `/api/products/size-config?productId=${encodeURIComponent(productId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const payload = (await res.json()) as SizeConfigResponse;
        if (!mounted) return;
        setData(payload);
      } catch {
        // Size preview should not break product card UI.
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [productId]);

  const labels = useMemo(() => {
    if (!data?.enabled) return [];
    return (data.options ?? [])
      .filter((option) => Number(option.qty ?? 0) > 0)
      .map(formatSizeLabel);
  }, [data]);

  if (labels.length === 0) return null;

  return (
    <p className="text-xs text-muted-foreground line-clamp-2">
      Sizes: {labels.join(", ")}
    </p>
  );
}
