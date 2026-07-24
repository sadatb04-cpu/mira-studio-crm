-- =========================================================================
-- Documents UX Enhancement: Use Description Instead of Filename
-- The `notes` column was already functioning as a free-text "Description"
-- field in the UI (Sprint 4.9's upload dialog labeled it exactly that) -
-- this renames it to match, rather than adding a second, redundant column.
-- All existing data (including nulls, for documents uploaded without one)
-- carries over unchanged under the new name.
-- =========================================================================

alter table public.documents rename column notes to description;
