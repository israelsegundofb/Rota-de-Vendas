## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2026-03-11 - [Array Method Loop Fusion in useFilters]
**Learning:** Chaining multiple sequential `.some()` or `.filter()` calls evaluating independent conditions on the same array inside a loop leads to redundant O(N) iterations and memory allocations. This is highly problematic on large inner arrays (e.g. `c.purchasedProducts`).
**Action:** Consolidate sequential iterations into a single pass loop. Track conditions independently inside the unified loop and break early when all conditions are met to eliminate redundant iterations.
