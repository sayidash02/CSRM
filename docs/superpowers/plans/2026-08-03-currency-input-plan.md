# Implementation Plan: Currency Input Formatting

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a real-time `CurrencyInput` component and integrate it into Daily Activities and CSR Projects.

**Tech Stack:** React, TypeScript.

---

### Task 1: Create CurrencyInput Component

**Files:**
- Create: `apps/web/src/components/ui/CurrencyInput.tsx`

- [ ] **Step 1: Write CurrencyInput logic**
  Create `apps/web/src/components/ui/CurrencyInput.tsx` using `write_to_file` (ensure parent directory `apps/web/src/components/ui/` exists, or just use the tool which handles it).
  ```tsx
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
  ```
- [ ] **Step 2: Commit**
  ```bash
  git add apps/web/src/components/ui/CurrencyInput.tsx
  git commit -m "feat(web): create reusable CurrencyInput component"
  ```

### Task 2: Apply to Daily Activities

**Files:**
- Modify: `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`

- [ ] **Step 1: Update DailyForm**
  Modify `apps/web/src/features/daily-activities/DailyActivitiesModule.tsx`.
  Import `CurrencyInput`: `import { CurrencyInput } from "../../components/ui/CurrencyInput";`
  In `DailyForm`, locate the `f.cost` field which looks like this:
  `<input type="number" value={f.cost} onChange={e => set("cost", e.target.value)} placeholder="0" className={\`\${inputCls} font-mono\`} />`
  Replace it with:
  `<CurrencyInput value={f.cost} onChange={val => set("cost", val)} className={\`\${inputCls} font-mono\`} />`
- [ ] **Step 2: Commit**
  ```bash
  git add apps/web/src/features/daily-activities/DailyActivitiesModule.tsx
  git commit -m "feat(web): use CurrencyInput for cost in Daily Activities"
  ```

### Task 3: Apply to CSR Projects

**Files:**
- Modify: `apps/web/src/features/csr-projects/CsrProjectsModule.tsx`

- [ ] **Step 1: Update CSR Project Form**
  Modify `apps/web/src/features/csr-projects/CsrProjectsModule.tsx`.
  Import `CurrencyInput`: `import { CurrencyInput } from "../../components/ui/CurrencyInput";`
  Locate the form input for budget which looks like this:
  `<input type="number" value={f.budget} onChange={e => set("budget", e.target.value)} placeholder="0" className={\`\${inputCls} font-mono\`} />`
  Replace it with:
  `<CurrencyInput value={f.budget} onChange={val => set("budget", val)} className={\`\${inputCls} font-mono\`} />`
- [ ] **Step 2: Commit**
  ```bash
  git add apps/web/src/features/csr-projects/CsrProjectsModule.tsx
  git commit -m "feat(web): use CurrencyInput for budget in CSR Projects"
  ```

Verify everything typechecks and runs perfectly.
