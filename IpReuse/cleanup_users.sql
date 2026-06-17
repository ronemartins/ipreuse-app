BEGIN TRANSACTION;

-- Delete group_members referencing users 1, 2, 3
DELETE FROM group_members WHERE user_id IN (1, 2, 3);

-- Update groups created by users 1, 2, 3 to user 4
UPDATE groups SET created_by = 4 WHERE created_by IN (1, 2, 3);

-- Update group_activities references
DELETE FROM group_activities WHERE user_id IN (1, 2, 3);

-- Update ip_documents references
UPDATE ip_documents SET uploaded_by = 4 WHERE uploaded_by IN (1, 2, 3);

-- Update ip_core references (already done but ensure)
UPDATE ip_core SET created_by = 4 WHERE created_by IN (1, 2, 3);

-- Now delete the users
DELETE FROM public.users WHERE id IN (1, 2, 3);

-- Set role to administrador for remaining users
UPDATE public.users SET role = 'administrador' WHERE id IN (4, 5);

COMMIT;

-- Verify
SELECT id, name, surname, username, role FROM public.users ORDER BY id;
