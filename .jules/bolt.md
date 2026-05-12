## 2024-03-04 - [Optimize date filtering in useFilters]
**Learning:** Parsing dates inside `Array.prototype.some` or `Array.prototype.filter` can cause massive performance overhead when filtering large client and product datasets, as `new Date()` is instantiated continuously inside the innermost loop.
**Action:** Always parse filter configuration (e.g., date ranges, lowercased query terms) outside the iteration block. Create the Date objects once, and use them repeatedly in the loop.

## 2025-02-14 - [Hoist String allocations outside filter loops]
**Learning:** Calling `.toLowerCase()` on variables like `searchTerm` *inside* an `Array.prototype.filter` loop causes $O(N)$ string allocations and runtime overhead, especially when checking multiple properties (e.g., `name`, `sku`, `brand`).
**Action:** Pre-compute and hoist the normalized search terms (e.g., `const normalizedSearch = searchTerm.toLowerCase();`) outside of iteration blocks to reduce memory pressure and cpu usage.

## 2024-04-01 - [High-Volume Array Loop Optimizations in Admin Dashboard]
**Learning:** In heavily nested loops over large datasets (e.g., iterating through `clientPurchases` for every product and date within `AdminDashboard.tsx`), typical string manipulation methods like `.split('-')` to parse dates introduce significant O(N) memory allocations and subsequent garbage collection overhead.
**Action:** Replace chaining operations and memory-allocating string parsing (`.split()`) with zero-allocation `.indexOf()` and `.substring()` when parsing millions of date string parts within high-throughput loops. This pattern provides an 8x throughput boost by dodging constant array initialization.
## 2025-03-08 - O(1) Lookups in React Hot Loops
**Learning:** Found an O(N*M) nested loop inside `handlePurchaseUpdateUpload` in `App.tsx` doing `.findIndex()` with string replacements `replace(/\D/g, '')` for every single upload record against every single existing client.
**Action:** Replaced `.findIndex` inside loops with O(1) Map lookups pre-built outside the loop (`cnpjMap` and `nameMap`), changing time complexity from O(N*M) to O(N+M) and reducing heavy regex allocations.

## 2025-04-19 - [Avoid Chained Array Operations in React Render Loops]
**Learning:** Chaining array methods like `.filter().map().filter(Boolean)` to generate derived unique sets (e.g., extracting distinct available states or cities from large `visibleClients` lists inside a `useMemo` in `useFilters.ts`) causes O(N) intermediate array allocations per step. This leads to heavy garbage collection pressure and significant UI stuttering when filtering large datasets during normal React render cycles.
**Action:** Replace multiple chained array manipulations used to build sets with a single-pass `for` loop directly pushing valid matches into a `Set()`. This bypasses intermediate allocations entirely, significantly reducing iteration latency (e.g., dropping execution time from ~800ms to ~150ms over 10k items with 1000 runs).
## 2026-04-20 - [Avoid chained array allocations in React renders]
**Learning:** Chained array methods like `.map().filter()` on potentially large arrays within React components cause unnecessary intermediate allocations. When creating new objects inside `.map` that are immediately thrown away by a subsequent `.filter`, memory usage spikes and GC is triggered, hurting render performance.
**Action:** Replace `.map().filter()` chains with a single-pass `.reduce()` that builds the final array directly, skipping the creation of intermediate objects entirely.

## 2024-05-12 - [Replace quadratic array deduplication with Set]
**Learning:** Using chained array methods like `.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)` for array deduplication results in an O(N^2) operation, causing severe CPU bottlenecking when merging long arrays of entity data during imports.
**Action:** Replace quadratic `findIndex` checks with an external `Set` to track unique keys, yielding an O(N) single-pass operation for deduplication. This consistently yields ~8x throughput improvements when iterating over thousands of merged items.
