## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2025-02-14 - [Hoist String allocations outside filter loops]
**Learning:** Calling `.toLowerCase()` on variables like `searchTerm` *inside* an `Array.prototype.filter` loop causes $O(N)$ string allocations and runtime overhead, especially when checking multiple properties (e.g., `name`, `sku`, `brand`).
**Action:** Pre-compute and hoist the normalized search terms (e.g., `const normalizedSearch = searchTerm.toLowerCase();`) outside of iteration blocks to reduce memory pressure and cpu usage.

## 2025-03-25 - [Optimize set generation from arrays]
**Learning:** Using chained array operations like `array.filter(condition).map(extract).filter(Boolean)` inside `useMemo` hooks to generate unique options lists (Sets) creates unnecessary intermediate array allocations, memory pressure, and garbage collection overhead. This becomes noticeably slow with thousands of client/product records.
**Action:** Replace chained `.filter().map()` operations with a single-pass `for` loop that iterates directly over the source array, performs the condition check, and directly calls `.add()` on the target `Set`.
