## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2025-02-14 - [Hoist String allocations outside filter loops]
**Learning:** Calling `.toLowerCase()` on variables like `searchTerm` *inside* an `Array.prototype.filter` loop causes $O(N)$ string allocations and runtime overhead, especially when checking multiple properties (e.g., `name`, `sku`, `brand`).
**Action:** Pre-compute and hoist the normalized search terms (e.g., `const normalizedSearch = searchTerm.toLowerCase();`) outside of iteration blocks to reduce memory pressure and cpu usage.

## 2025-02-20 - [Optimize date string manipulation in hot loops]
**Learning:** Using `.split()` or Regex parsing (`String.match`) for extracting string parts (like date components) inside hot loops generates excessive array allocations and causes huge garbage collection overhead. This limits processing speed for large client/purchase datasets.
**Action:** Use `.indexOf()` and `.substring()` for manual string extraction instead. It does not allocate intermediary arrays and is significantly faster inside critical iterations like `clientPurchases.forEach` and `.some()`. Also centralize parsing inside high-performance utility helpers.
