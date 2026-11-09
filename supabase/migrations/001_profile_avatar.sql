-- Profile pictures. Run once in the Supabase SQL editor on a project that already ran schema.sql.
--
-- `avatar` holds either {"kind":"emoji","emoji":"🦊","color":"#E07A1F"} or
-- {"kind":"photo","uri":"data:image/jpeg;base64,..."} (a ~192 px JPEG, around 8 KB).
-- The app also rejects anything that is not in one of those two shapes when it reads an avatar.
--
-- Existing RLS already covers it: you can update your own profile row, and you can read the
-- profiles of people you share a group with. Until this is run the app still works; people just
-- show their initials, and saving a picture reports that it is not set up on the server yet.

alter table public.profiles
  add column if not exists avatar jsonb
  check (avatar is null or pg_column_size(avatar) < 60000);
