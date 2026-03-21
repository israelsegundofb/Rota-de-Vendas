## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2025-02-14 - [Hoist String allocations outside filter loops]
**Learning:** Calling `.toLowerCase()` on variables like `searchTerm` *inside* an `Array.prototype.filter` loop causes $O(N)$ string allocations and runtime overhead, especially when checking multiple properties (e.g., `name`, `sku`, `brand`).
**Action:** Pre-compute and hoist the normalized search terms (e.g., `const normalizedSearch = searchTerm.toLowerCase();`) outside of iteration blocks to reduce memory pressure and cpu usage.

## 2026-03-21 - [Replace O(N*M) Array.find with O(N+M) Map lookup]
**Learning:** In components rendering large datasets like `AdminDashboard`, placing `Array.find()` (an (M)$ operation) inside a `forEach` or `map` loop iterating over $ items results in an (N 	imes M)$ time complexity. This causes significant UI blocking during render passes when filters change.
**Action:** Hoist the list lookup by pre-computing a `Map` (e.g., `new Map(items.map(i => [i.id, i.name]))`) outside the loop, reducing the overall complexity to (N + M)$ via (1)$ `Map.get()` lookups.
