# React Query Caching Implementation Design

## 1. Overview
The current application fetches data on every component mount (e.g., when switching modules in the sidebar), causing noticeable delays for users on slower connections. This design implements data caching using `@tanstack/react-query` to provide immediate feedback when revisiting modules, utilizing a "Stale-While-Revalidate" approach.

## 2. Global Setup & Configuration
- **Library**: `@tanstack/react-query` will be introduced to handle caching, background refetching, and state management for API calls.
- **Query Client Configuration** (`apps/web/src/lib/queryClient.ts`):
  - `staleTime`: 5 minutes. Cached data is considered fresh for this period; navigating between screens within 5 minutes will instantly show cached data without triggering a background network request.
  - `gcTime` (Garbage Collection Time): 15 minutes. Data not actively used by any mounted component will be kept in memory for 15 minutes before being discarded.
- **Provider**: The application root (`apps/web/src/main.tsx` or equivalent) will be wrapped in `<QueryClientProvider>` to make the client accessible throughout the React tree.

## 3. Proof of Concept: Proposals Module
To ensure a safe migration, the implementation will begin with a single module as a Proof of Concept (PoC), such as the **Proposals** module.

### Query Hooks
- **File**: `apps/web/src/hooks/useProposals.ts`
- **Responsibilities**:
  - Encapsulate the `axios.get` call to the corresponding API endpoint.
  - Define a strict Query Key structure, primarily `['proposals', 'list']`.
  - Return the `{ data, isLoading, isError }` states to the component.

### Component Updates
- The component rendering the Proposals list will be refactored to remove the local `useState` (for data/loading) and `useEffect` fetching logic.
- It will directly consume `useProposals()`. The UI will reflect the loading state on initial load, and instantly render cached data on subsequent visits.

## 4. Mutations & Cache Invalidation
- **Mutation Hooks**: Additions, edits, and deletions will be managed via `useMutation` (e.g., `useCreateProposal`).
- **Cache Invalidation**: Upon successful completion of a mutation, the hook will call `queryClient.invalidateQueries({ queryKey: ['proposals'] })`.
- **Outcome**: This action marks the 'proposals' cache as stale and instantly triggers a background refetch, ensuring the UI accurately reflects the newest server state without requiring a manual browser refresh.
