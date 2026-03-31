## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2025-02-14 - [Hoist String allocations outside filter loops]
**Learning:** Calling `.toLowerCase()` on variables like `searchTerm` *inside* an `Array.prototype.filter` loop causes $O(N)$ string allocations and runtime overhead, especially when checking multiple properties (e.g., `name`, `sku`, `brand`).
**Action:** Pre-compute and hoist the normalized search terms (e.g., `const normalizedSearch = searchTerm.toLowerCase();`) outside of iteration blocks to reduce memory pressure and cpu usage.

## 2025-03-31 - [Optimize filter options generation with Sets]
**Learning:** Using chained array methods (`.filter().map().filter(Boolean)`) or `.forEach()` over large collections creates significant overhead due to multiple intermediate array allocations and function call overhead.
**Action:** Replace chained array operations used to derive unique sets with single-pass `for` loops directly populating a `Set`. This avoids O(N) intermediate array allocations and reduces garbage collection pressure.
