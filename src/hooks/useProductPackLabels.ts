"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PackLabelMap = Record<string, string | null>;

function compactPositive(labels: PackLabelMap): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, label] of Object.entries(labels)) {
    if (label) out[id] = label;
  }
  return out;
}

/**
 * Resolves compact “Set of N” labels for catalog cards.
 * Seeds from SSR `initialLabels`, then fetches any missing ids (e.g. load more).
 */
export function useProductPackLabels(
  productIds: string[],
  initialLabels?: PackLabelMap | null,
) {
  const idsKey = useMemo(() => {
    const unique = [
      ...new Set(productIds.map((id) => id.trim()).filter(Boolean)),
    ];
    unique.sort();
    return unique.join(",");
  }, [productIds]);

  const [labels, setLabels] = useState<Record<string, string>>(() =>
    compactPositive(initialLabels ?? {}),
  );
  const checkedRef = useRef<Set<string>>(
    new Set(Object.keys(initialLabels ?? {})),
  );

  useEffect(() => {
    if (!initialLabels) return;
    setLabels((prev) => ({ ...compactPositive(initialLabels), ...prev }));
    for (const id of Object.keys(initialLabels)) {
      checkedRef.current.add(id);
    }
  }, [initialLabels]);

  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(",").filter(Boolean);
    const missing = ids.filter((id) => !checkedRef.current.has(id));
    if (missing.length === 0) return;

    for (const id of missing) checkedRef.current.add(id);

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          `/api/storefront/pack-labels?ids=${encodeURIComponent(missing.join(","))}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          for (const id of missing) checkedRef.current.delete(id);
          return;
        }
        const body = (await res.json()) as { labels?: PackLabelMap };
        const fetched = body.labels ?? {};
        setLabels((prev) => ({ ...prev, ...compactPositive(fetched) }));
        for (const id of Object.keys(fetched)) {
          checkedRef.current.add(id);
        }
      } catch {
        for (const id of missing) checkedRef.current.delete(id);
      }
    })();

    return () => controller.abort();
  }, [idsKey]);

  return labels;
}
