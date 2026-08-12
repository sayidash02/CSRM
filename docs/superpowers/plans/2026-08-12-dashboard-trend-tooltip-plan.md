# Dashboard Trend Indicator Tooltip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a descriptive tooltip to the trend indicator on the Dashboard Daily Activities card.

**Architecture:** Pure UI change in `DashboardModule.tsx`. We will alias the Radix Tooltip to avoid conflicting with the Recharts Tooltip.

**Tech Stack:** React, Radix UI.

---

### Task 1: Add Tooltip to Trend Indicator

**Files:**
- Modify: `apps/web/src/features/dashboard/DashboardModule.tsx:7-12` (imports)
- Modify: `apps/web/src/features/dashboard/DashboardModule.tsx:140-145` (markup)

- [ ] **Step 1: Import Tooltip components**

Target:
```typescript
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";
import { ImportWizardModal } from "../import/ImportWizardModal";
```

Replace with:
```typescript
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";
import { ImportWizardModal } from "../import/ImportWizardModal";
import {
  TooltipProvider,
  Tooltip as UITooltip,
  TooltipTrigger,
  TooltipContent
} from "../../app/components/ui/tooltip";
```

- [ ] **Step 2: Wrap trend indicator in Tooltip**

Target (around line 140-145):
```typescript
                {s.trend !== undefined && (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium font-mono ${s.trend >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                    {s.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {s.trend >= 0 ? `+${s.trend}%` : `${s.trend}%`}
                  </span>
                )}
```

Replace with:
```typescript
                {s.trend !== undefined && (
                  <TooltipProvider>
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium font-mono cursor-help ${s.trend >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {s.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {s.trend >= 0 ? `+${s.trend}%` : `${s.trend}%`}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Dibandingkan dengan minggu lalu</p>
                      </TooltipContent>
                    </UITooltip>
                  </TooltipProvider>
                )}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/dashboard/DashboardModule.tsx
git commit -m "feat(ui): add tooltip to dashboard trend indicator"
```
