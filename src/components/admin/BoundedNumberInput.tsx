"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type BoundedNumberInputHandle = {
  commit: () => number;
};

type BoundedNumberInputProps = {
  id?: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  placeholder?: string;
};

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Number field that allows clearing while typing; clamps on blur, Enter, or commit(). */
export const BoundedNumberInput = forwardRef<
  BoundedNumberInputHandle,
  BoundedNumberInputProps
>(function BoundedNumberInput(
  {
    id,
    value,
    onValueChange,
    min,
    max,
    disabled,
    className,
    "aria-invalid": ariaInvalid,
    placeholder,
  },
  ref,
) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      setDraft(String(value));
      return value;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return value;
    }

    const next = clampInt(parsed, min, max);
    onValueChange(next);
    setDraft(String(next));
    return next;
  };

  useImperativeHandle(ref, () => ({
    commit: () => commitDraft(draft),
  }));

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      placeholder={placeholder}
      aria-invalid={ariaInvalid}
      className={cn(className)}
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        if (next === "" || /^\d+$/.test(next)) {
          setDraft(next);
        }
      }}
      onBlur={() => {
        commitDraft(draft);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commitDraft(draft);
        }
      }}
    />
  );
});

export default BoundedNumberInput;
