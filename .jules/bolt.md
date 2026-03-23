## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2025-02-14 - [Hoist String allocations outside filter loops]
**Learning:** Calling `.toLowerCase()` on variables like `searchTerm` *inside* an `Array.prototype.filter` loop causes $O(N)$ string allocations and runtime overhead, especially when checking multiple properties (e.g., `name`, `sku`, `brand`).
**Action:** Pre-compute and hoist the normalized search terms (e.g., `const normalizedSearch = searchTerm.toLowerCase();`) outside of iteration blocks to reduce memory pressure and cpu usage.

## 2025-02-14 - [Optimize validation short-circuiting in purchaseUtils.ts]
**Learning:** Checking nested properties (e.g., `p.quantity > 0 || p.totalValue > 0`) is more expensive than simple string comparisons (e.g., `p.salespersonId !== filterSalespersonId`). In functions called thousands of times like `isValidPurchase`, the order of short-circuit evaluations matters significantly.
**Action:** Always reorder conditionals in hot validation paths to evaluate lightweight string comparisons and basic checks before complex numeric checks or multiple property accesses to maximize short-circuiting efficiency.
