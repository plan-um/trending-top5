-- Add 'rising' category to the trends table constraint
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard

-- Drop existing constraint
ALTER TABLE trends DROP CONSTRAINT IF EXISTS trends_category_check;

-- Add new constraint with 'rising' category
ALTER TABLE trends ADD CONSTRAINT trends_category_check
  CHECK (category IN ('keyword', 'social', 'content', 'overall', 'rising'));

-- Verify the change
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'trends'::regclass AND contype = 'c';
