-- =========================================================================
-- Permission System Update - Add Tasks Module
--
-- Tasks was the one module left out of Sprint 4.13's permission system.
-- This adds it as a first-class module, seeded per existing role exactly
-- like every other module was in 0011, so nobody's current access to
-- Tasks changes the moment this lands.
-- =========================================================================

alter type public.permission_module add value 'tasks' after 'inventory';
