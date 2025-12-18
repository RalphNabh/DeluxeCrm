-- Storage Bucket Policies for Materials
-- Run this in Supabase SQL Editor after creating the 'materials' bucket

-- First, ensure the bucket exists (if not, create it via Dashboard)
-- Then run these policies

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload materials"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to read their own files
CREATE POLICY "Allow authenticated users to read their materials"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to update their own files
CREATE POLICY "Allow authenticated users to update their materials"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to delete their own files
CREATE POLICY "Allow authenticated users to delete their materials"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'materials' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Alternative: If you want the bucket to be public (anyone can read, but only authenticated users can upload)
-- Uncomment these policies and comment out the read policy above:

-- CREATE POLICY "Allow public read access to materials"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'materials');


