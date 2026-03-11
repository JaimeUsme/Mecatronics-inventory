-- 017 - Split wispro_plan_id into single and double contract ids

ALTER TABLE planes
  ADD COLUMN wispro_plan_id_single_contract VARCHAR(100) NULL AFTER value,
  ADD COLUMN wispro_plan_id_double_contract VARCHAR(100) NULL AFTER wispro_plan_id_single_contract;

UPDATE planes
SET
  wispro_plan_id_single_contract = wispro_plan_id,
  wispro_plan_id_double_contract = wispro_plan_id
WHERE wispro_plan_id IS NOT NULL;

ALTER TABLE planes
  MODIFY COLUMN wispro_plan_id_single_contract VARCHAR(100) NOT NULL,
  MODIFY COLUMN wispro_plan_id_double_contract VARCHAR(100) NOT NULL;

ALTER TABLE planes
  ADD INDEX idx_planes_wispro_plan_id_single_contract (wispro_plan_id_single_contract),
  ADD INDEX idx_planes_wispro_plan_id_double_contract (wispro_plan_id_double_contract);

ALTER TABLE planes
  DROP INDEX idx_planes_wispro_plan_id;

ALTER TABLE planes
  DROP COLUMN wispro_plan_id;
