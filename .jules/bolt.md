## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2025-02-14 - [Hoist String allocations outside filter loops]
**Learning:** Calling `.toLowerCase()` on variables like `searchTerm` *inside* an `Array.prototype.filter` loop causes $O(N)$ string allocations and runtime overhead, especially when checking multiple properties (e.g., `name`, `sku`, `brand`).
**Action:** Pre-compute and hoist the normalized search terms (e.g., `const normalizedSearch = searchTerm.toLowerCase();`) outside of iteration blocks to reduce memory pressure and cpu usage.

## 2024-03-19 - [Memoize react-virtuoso props]
**Learning:** Passing inline arrow functions to `itemContent` or inline object literals to `components` in `react-virtuoso`'s `Virtuoso` and `VirtuosoGrid` causes the virtualized list to fail referential equality checks on every parent render. This leads to severe performance degradation, including full unmounting and remounting of list items.
**Action:** Always wrap `itemContent` functions in `useCallback` and `components` overrides in `useMemo` when working with `react-virtuoso` components to maintain stable references.
