DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'DM_EMPLOYEE'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'DM_EMPLOYEE' TO 'DM_EXECUTIVE';
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'DM_EXECUTIVE'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'DM_EXECUTIVE';
  END IF;
END $$;
