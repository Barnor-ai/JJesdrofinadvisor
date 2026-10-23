# Architecture rules
- Downloaded report charts use a presentation-only model built from existing analysis fields, rendered to embedded PNGs for PDF, Word and Excel; this keeps documents portable without changing financial calculations or dashboard components.
- Keep report colors as global CSS tokens and keep chart rendering browser-only with dynamic imports; exports must remain safe to import during SSR.
- Content routes use a shared metadata helper with distinct titles and descriptions so social previews describe the actual page without altering its visible interface.