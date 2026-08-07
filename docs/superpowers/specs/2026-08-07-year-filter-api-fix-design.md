# Global Year Filter API 404 Fix Design

## Problem
The global year filter in the top right of the application is failing to show all available years (e.g., 2024, 2025). The frontend makes a request to `GET /api/years/available`, but the backend route is defined as `GET /api/years`. 
This results in a `404 Not Found` error. The frontend catches this error silently and falls back to displaying only the current year (`[new Date().getFullYear()]`).

## Selected Solution: Fix Frontend API Call
We will update the frontend's API call in `App.tsx` to correctly target the existing backend route (`/years`) instead of the non-existent `/years/available`. This aligns with RESTful conventions.

### Architecture & Implementation Details
1. **Target File**: `apps/web/src/app/App.tsx`
2. **Change**: Locate the `useEffect` that fetches the available years.
3. **Logic**: Change the endpoint path from `'/years/available'` to `'/years'`.
4. **Impact**: The frontend will now successfully hit the backend controller (`YearsController.ts`), which queries all relevant tables and returns an array of distinct years (`[2026, 2025, 2024]`). The dropdown will populate correctly.

### Code Modification Preview
```tsx
// Before
useEffect(() => {
  apiClient.get('/years/available')
    .then(res => setAvailableYears(res.data.data))
    .catch(() => setAvailableYears([new Date().getFullYear()]));
}, [activeModule]);

// After
useEffect(() => {
  apiClient.get('/years')
    .then(res => setAvailableYears(res.data.data))
    .catch(() => setAvailableYears([new Date().getFullYear()]));
}, [activeModule]);
```

### Validation
- Ensure Vite build succeeds.
- Verify that the years dropdown successfully loads the years present in the database (e.g., 2024, 2025, 2026) when the application starts or a module is switched.
