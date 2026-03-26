"use client";

import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatNumber, parseKRW } from "@/lib/format";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ value, onChange, ...props }, ref) {
    const [display, setDisplay] = useState(value ? formatNumber(value) : "");

    useEffect(() => {
      setDisplay(value ? formatNumber(value) : "");
    }, [value]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value.replace(/[^0-9]/g, "");
      const num = Number(raw) || 0;
      setDisplay(num ? formatNumber(num) : "");
      onChange(num);
    }

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          ₩
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          className="pl-8 text-right"
          value={display}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);
