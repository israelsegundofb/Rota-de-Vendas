## 2026-02-23 - React Virtuoso Performance Anti-Pattern
**Learning:** Defining components inline in `Virtuoso`'s `components` prop (e.g., `components={{ List: ... }}`) causes the entire list to unmount and remount on every render, severely impacting performance and causing potential loss of scroll/focus.
**Action:** Always define `Virtuoso` components (List, Item, etc.) as stable references outside the render function or memoize them with `useMemo`.
