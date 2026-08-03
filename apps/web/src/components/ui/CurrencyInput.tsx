import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value: string | number;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function CurrencyInput({ value, onChange, placeholder, className }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  // Update display value when prop changes from parent
  useEffect(() => {
    const numericString = String(value).replace(/\D/g, "");
    if (!numericString || numericString === "0") {
      setDisplayValue("");
    } else {
      setDisplayValue(Number(numericString).toLocaleString('id-ID'));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawString = e.target.value.replace(/\D/g, "");
    if (rawString) {
      // Remove leading zeroes
      rawString = String(Number(rawString));
    }
    // Send raw unformatted string to parent
    onChange(rawString);
  };

  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-muted-foreground pointer-events-none select-none text-sm">Rp</span>
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder || "0"}
        className={`pl-9 ${className || ""}`}
      />
    </div>
  );
}
