# Global Search Debounce Design Spec

## Overview
The current `useGlobalSearch` hook evaluates search filtering synchronously on every keystroke. For large datasets, recursively extracting searchable text from all object properties and running string matches causes significant main-thread blocking, resulting in UI jank/lag. This spec outlines a simple client-side debouncing solution to ensure the search input remains responsive while deferring the heavy filtering computation.

## Architecture

We will implement a custom `useDebounce` hook and integrate it directly inside the existing `useGlobalSearch` hook.

### 1. `useDebounce` Hook
**Location:** `apps/web/src/hooks/useDebounce.ts`

- **Purpose:** Delays the update of a state value until after a specified delay has passed since the last change.
- **Inputs:** `value` (any generic type `T`), `delay` (number in ms).
- **Outputs:** `debouncedValue` (type `T`).
- **Mechanism:** Uses `useEffect` and `setTimeout`. When `value` changes, it clears the previous timeout and sets a new one. Once the timeout completes, `debouncedValue` is updated.

### 2. `useGlobalSearch` Modification
**Location:** `apps/web/src/hooks/useGlobalSearch.ts`

- **Change:** 
  - Keep `q` (search query) as immediate state so the input UI updates instantly.
  - Pass `q` to `useDebounce` to get `debouncedQ` (e.g., with a 300ms delay).
  - Modify the `useMemo` that computes `filtered` to depend on `debouncedQ` instead of `q`.
- **Impact:** The UI component receives the exact same API (`{ q, setQ, filtered }`). The input value updates instantly (no lag), but `filtered` only recalculates 300ms after the user stops typing.

## Backward Compatibility & Scope
- **Zero UI Changes:** Because the API signature of `useGlobalSearch` remains identical, no changes are needed in `CsrProjectsModule.tsx`, `DataTable.tsx`, or any other consumer of `useGlobalSearch`.
- **Target Size:** This client-side approach is deemed sufficient for datasets in the range of thousands of rows. If data scales to tens of thousands or hundreds of thousands of rows in the future, a server-side search migration will be required.

## Testing & Verification
- **Unit/Manual Test:** Type rapidly in the search bar. The input cursor should not lag or freeze. The table data should update a fraction of a second after typing ceases.
- **Edge cases:** Empty search string should immediately return all items without delay if possible, or gracefully wait the 300ms without issues.
