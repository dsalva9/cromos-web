-- Drop duplicate INSERT policy on profiles table (both checked exact same condition)
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON "public"."profiles";
