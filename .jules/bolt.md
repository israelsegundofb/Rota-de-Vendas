## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2025-02-14 - [Hoist String allocations outside filter loops]
**Learning:** Calling `.toLowerCase()` on variables like `searchTerm` *inside* an `Array.prototype.filter` loop causes $O(N)$ string allocations and runtime overhead, especially when checking multiple properties (e.g., `name`, `sku`, `brand`).
**Action:** Pre-compute and hoist the normalized search terms (e.g., `const normalizedSearch = searchTerm.toLowerCase();`) outside of iteration blocks to reduce memory pressure and cpu usage.

## 2025-03-14 - [Replace chained array iterations with Single-Pass Set Population]
**Learning:** Chained array operations (`.filter().map().filter(Boolean)`) when computing unique dropdown values (e.g., extracting a unique list of Categories from an array of Products) causes multiple intermediate arrays to be allocated and iterated over. This creates significant GC (Garbage Collection) pressure and wastes CPU cycles, particularly on large arrays.
**Action:** Replace `items.map(p => p.category).filter(Boolean)` with a single `for` loop that iterates over `items` once and directly `.add()`s truthy properties to a `Set`.
