-- Inventory Setup Wizard UI state (acknowledgements only; not source of truth for completion).
-- See apps/supersolt/docs/features/inventory-setup/setup-wizard/plan.md §4.
--
-- Shape:
--   {
--     introSeen:    string[],                                  -- stage ids whose welcome was shown
--     stageAcks:    Record<stage, { at: string, by: uuid }>,   -- explicit "stage done" confirmations
--     subStepAcks:  Record<ackKey, { at: string, by: uuid }>   -- per-sub-step confirmations
--   }
--
-- Reads ride the existing venues select RLS (any active org member). Writes are
-- constrained to manager+ at the service layer (assertInventorySetupWriteAccess).

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS inventory_setup_wizard_state jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.venues.inventory_setup_wizard_state IS
  'Inventory Setup Wizard UI state (acknowledgements only; not source of truth for completion). { introSeen: string[], stageAcks: Record<stage,{at,by}>, subStepAcks: Record<ackKey,{at,by}> }.';
