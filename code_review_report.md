# Code Review Report

## 1. `supabase/functions/get-mrk-prices/index.ts`
**Bug/Logic Error:** The WooCommerce API typically restricts `per_page` to a maximum of 100. If the store currently (or in the future) has more than 100 products, this API call will silently truncate the catalog, causing missing products on the frontend.
*Lines 15-19:*
```typescript
const response = await fetch("https://www.mrk.co.za/wp-json/wc/store/v1/products?per_page=100", {
    headers: {
        'Accept': 'application/json'
    }
});
```
**Fix Options:**
1. Implement pagination using the `page` query parameter and loop until all products are fetched (checking the `X-WP-TotalPages` header).
2. If only specific categories of metals are needed, add a `category` query parameter to filter results to stay well under the 100-item limit.
3. Narrow the search directly (e.g., using `search=` query parameter) if only a subset of products is desired.

## 2. `src/components/MrkPricesCard.tsx`
**Bug/State Leak:** If the component unmounts while the asynchronous `fetchPrices` call is in-flight—or on unmount during the 5-minute interval trigger—React state setters (`setMetalPrices`, `setLoading`, `setError`) will be called on an unmounted component.
*Lines 66, 69, 71:*
```typescript
setMetalPrices(extractedPrices);
// ...
setError(err instanceof Error ? err.message : "An error occurred");
// ...
setLoading(false);
```
**Fix Options:**
1. Use `@tanstack/react-query` (which is already configured in this project's `App.tsx`) via `useQuery` to handle fetching. It natively manages unmounting, polling (via `refetchInterval`), caching, and loading states without manual `useEffect` bugs.
2. Use an `AbortController` inside the `useEffect` to abort the `fetchPrices` request in the cleanup function.
3. Introduce an `isMounted` boolean flag inside the `useEffect` that gets set to `false` in the cleanup function, preventing state updates if `isMounted` is false.
