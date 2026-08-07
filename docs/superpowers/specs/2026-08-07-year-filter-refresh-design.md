# Global Year Filter Refresh Design

## Problem
Currently, the global year filter in the top right of the application (`App.tsx`) only fetches the available years from the API once on the initial page load. If a user adds a record with a new year (e.g., 2025) while using the application, the dropdown does not update to show the new year until the browser is manually refreshed.

## Selected Solution: Refresh on Module Switch
The user selected the most minimal-impact approach: the dropdown will re-fetch the available years whenever the user switches between modules (e.g., moving from "Daily Activities" to "Dashboard").

### Architecture & Implementation Details
1. **Target File**: `apps/web/src/app/App.tsx`
2. **Change**: Update the `useEffect` hook that fetches `/years/available`.
3. **Logic**: Add `activeModule` to the dependency array of the `useEffect`. This ensures that every time `activeModule` changes (which happens when the user clicks a different item in the Sidebar), the `apiClient.get('/years/available')` call is re-triggered.
4. **Trade-off Accepted**: The year will not appear in real-time immediately after saving a form. The user must navigate to another module and back to see the newly added year in the dropdown. This trade-off was explicitly chosen for its absolute minimal system impact.

### Code Modification Preview
```tsx
// Before
useEffect(() => {
  apiClient.get('/years/available')
    .then(res => setAvailableYears(res.data.data))
    .catch(() => setAvailableYears([new Date().getFullYear()]));
}, []);

// After
useEffect(() => {
  apiClient.get('/years/available')
    .then(res => setAvailableYears(res.data.data))
    .catch(() => setAvailableYears([new Date().getFullYear()]));
}, [activeModule]); // Added dependency
```

### Validation
- Ensure Vite build succeeds.
- When implemented, switching modules should trigger a network request to `/years/available`.
