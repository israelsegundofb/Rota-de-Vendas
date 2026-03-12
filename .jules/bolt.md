## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2025-03-12 - [Loop Fusion for nested array filtering]
**Learning:** Using multiple consecutive `.some()` or `.filter()` calls on a nested array (e.g., `client.purchasedProducts`) inside a large dataset filter loop creates significant N*M complexity and redundant allocations.
**Action:** Consolidate multiple iteration conditions into a single pass loop over the nested array. Track condition flags independently, evaluate conditions only when their flag is false, and break the loop early when all flags become true.
