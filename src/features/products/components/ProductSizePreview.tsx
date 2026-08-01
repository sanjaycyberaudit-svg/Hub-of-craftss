"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchWithTimeout } from "@/lib/network/fetchWithTimeout";
import { DEFAULT_PRODUCT_OPTION_NAME } from "@/lib/products/sizeConfig-shared";

type SizeOption = {
  value?: string;
  size?: string;
  qty: number;
};

type SizeConfigResponse = {
  enabled: boolean;
  name?: string;
  options: SizeOption[];
  groups?: Array<{
    id?: string;
    name?: string;
    options: SizeOption[];
  }>;
};

function formatSizeLabel(option: SizeOption) {
  const size = String(option.value ?? option.size ?? "")
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
        // Option preview should not break product card UI.
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [productId]);

  const optionName =
    String(data?.name ?? "").trim() || DEFAULT_PRODUCT_OPTION_NAME;

  const labels = useMemo(() => {
    if (!data?.enabled) return [];
    const groups =
      Array.isArray(data.groups) && data.groups.length > 0
        ? data.groups
        : [{ name: data.name, options: data.options ?? [] }];
    return groups.flatMap((group) =>
      (group.options ?? [])
        .filter((option) => Number(option.qty ?? 0) > 0)
        .map((option) => {
          const label = formatSizeLabel(option);
          return groups.length > 1
            ? `${String(group.name ?? optionName).trim() || optionName}: ${label}`
            : label;
        }),
    );
  }, [data, optionName]);

  if (labels.length === 0) return null;

  return (
    <div
      className="craft-size-pills"
      aria-label={`${optionName}: ${labels.join(", ")}`}
    >
      {labels.map((label) => (
        <span key={label} className="craft-size-pill">
          {label}
        </span>
      ))}
    </div>
  );
}
