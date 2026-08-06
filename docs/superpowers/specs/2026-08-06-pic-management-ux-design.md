# PIC Management UI/UX Improvements Design Spec

## Overview
The "PicManagementModal" currently suffers from silent failures and lacks interactive feedback. Users report that clicking "Tambah" or the checkmark icon to save an edited PIC name often silently fails (due to validation or network issues) or doesn't provide visual feedback that the click was registered. This spec outlines the improvements to the modal to provide clear visual feedback, loading states, and robust error handling.

## Scope
- Modify `PicManagementModal.tsx` in the web application (`apps/web/src/features/daily-activities/PicManagementModal.tsx`).
- Modify `DailyActivitiesModule.tsx` to pass down the existing `showToast` function to `PicManagementModal`.
- Minor style updates for buttons to include tactile click animations (`active:scale-95`).

## Architecture & Data Flow
1. **Toast Notifications Injection**:
   - `DailyActivitiesModule` already receives `showToast` from its parent. It will pass this function as a prop to `PicManagementModal`.
   - `PicManagementModal` will use `showToast` inside its `try/catch` blocks.
2. **Error Handling**:
   - API calls (`apiClient.post`, `apiClient.put`, `apiClient.delete`) will be wrapped in `try/catch`. 
   - On success: Show a success toast (e.g., "PIC berhasil ditambahkan").
   - On catch: Read the error response (`e.response?.data?.error` or similar) and show it as an error toast. If no message is provided by the backend, fallback to a generic "Terjadi kesalahan. Gagal memproses data PIC."
3. **Loading States**:
   - Introduce a new state `isSubmitting` (boolean).
   - Set to `true` before API call, `false` in `finally` block.
   - While `isSubmitting` is true, buttons should be disabled (`disabled={isSubmitting}`) and visually muted (`opacity-50`).

## UI Enhancements
- **Button Micro-animations**: 
  - The "Tambah" button will receive `active:scale-95 transition-all`.
  - Icon buttons (Check, Edit, Delete, X) will receive `active:scale-90 transition-transform`.
- **Keyboard Interactivity**: 
  - Ensure the "Enter" keypress on the add input correctly triggers `handleAdd`. (Already exists, but ensure it prevents default if necessary and respects `isSubmitting`).

## Known Limitations / Out of Scope
- This spec does not modify the backend (`PicsController.ts`), which is assumed to be functioning correctly and returning appropriate HTTP status codes on errors.
- We will not add a global spinner over the entire modal; inline disabling of buttons is sufficient.

## Security & Privacy
- No new data points are being exposed or stored. Handled purely at the UI layer.

## Testing Strategy
- **Manual Testing**:
  - Test adding a new PIC -> Expect success toast and immediate list update.
  - Test adding a duplicate PIC (assuming backend rejects it) -> Expect error toast and no list update.
  - Test editing an existing PIC -> Expect success toast.
  - Test clicking buttons rapidly -> `isSubmitting` should prevent double-submissions.
