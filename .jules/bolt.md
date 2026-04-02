## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2025-02-14 - [Hoist String allocations outside filter loops]
**Learning:** Calling `.toLowerCase()` on variables like `searchTerm` *inside* an `Array.prototype.filter` loop causes $O(N)$ string allocations and runtime overhead, especially when checking multiple properties (e.g., `name`, `sku`, `brand`).
**Action:** Pre-compute and hoist the normalized search terms (e.g., `const normalizedSearch = searchTerm.toLowerCase();`) outside of iteration blocks to reduce memory pressure and cpu usage.

## 2024-04-02 - [Replace Array.find with Map lookup in loops]
**Learning:** Using `Array.prototype.find()` inside iteration loops (e.g., `clients.forEach`) creates an O(N*M) time complexity. This causes significant performance bottlenecks when processing large data structures, like client lists matching against user lists.
**Action:** Always pre-compute a `Map` (e.g., `new Map(users.map(u => [u.id, u]))`) before the loop to achieve O(1) lookups inside the iteration block, reducing the total time complexity to O(N+M).
