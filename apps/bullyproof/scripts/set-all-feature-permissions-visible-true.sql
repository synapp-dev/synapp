-- Set visible = true for every row in feature_permissions
UPDATE feature_permissions
SET visible = true
WHERE visible IS DISTINCT FROM true;
