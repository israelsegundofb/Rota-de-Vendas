## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2024-05-15 - [Optimize nested array lookup in `forEach`]
**Learning:** `Array.prototype.find()` operations inside iteration loops cause O(N^2) complexity. This happens often when looking up user/seller information inside a list of clients.
**Action:** Use a `Map` created before the iteration (`new Map(users.map(u => [u.id, u.name]))`) to achieve O(1) lookups during the main loop.

## 2024-05-15 - [Avoid repeated helper abstractions for Date parsing]
**Learning:** Functions like `isDateInRange` abstractions inside loops might abstract string-to-Date parsing operations on every step, degrading performance over time.
**Action:** Lift the static string parsings (`startDate` and `endDate`) outside loops, parse once, and inline the date filtering logic when possible, checking first for boundary existences (early returns).
