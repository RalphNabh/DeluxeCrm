# Supabase Storage Setup for Materials Images

## Steps to Enable Image Uploads

1. **Create Storage Bucket:**
   - Go to your Supabase Dashboard
   - Navigate to Storage
   - Click "New bucket"
   - Name: `materials`
   - Make it **Public** (or set up proper RLS policies)
   - Click "Create bucket"

2. **Set Bucket Policies:**
   - **Option A (Recommended)**: Run the SQL migration file `supabase-storage-materials-policies.sql` in Supabase SQL Editor
   - **Option B (Manual)**: Go to Storage > Policies and create policies manually:
     - **SELECT**: Allow authenticated users to read their own files
     - **INSERT**: Allow authenticated users to upload to their own folder
     - **UPDATE**: Allow users to update their own files
     - **DELETE**: Allow users to delete their own files
   
   **Important**: The policies ensure users can only access files in their own folder (organized by user_id)

3. **Run Database Migration:**
   - Run `supabase-materials-images-schema.sql` in your Supabase SQL Editor
   - This adds the `image_url` column to the materials table

4. **Test:**
   - Go to Materials Catalog page
   - Create a new material and upload an image
   - Verify the image displays correctly

