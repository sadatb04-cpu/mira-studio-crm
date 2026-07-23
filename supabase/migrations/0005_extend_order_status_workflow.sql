-- =========================================================================
-- Sprint 4.1.3 (Order Workflow & Status Automation)
-- Extends order_status with the intermediate sales-review stages between
-- "draft" and "in_production". "confirmed" and "completed" are left as
-- legacy/unused values (not reachable by the new automated transitions,
-- but harmless if any historical row already has them) rather than
-- repurposing their meaning, which would make raw DB values misleading.
-- =========================================================================

alter type public.order_status add value 'pricing_ready';
alter type public.order_status add value 'awaiting_approval';
alter type public.order_status add value 'approved';
