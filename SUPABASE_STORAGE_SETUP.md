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
   - **Option A (Recommended)**: Apply migrations with `npx supabase db push` (materials storage policies live in `supabase/migrations/`)
   - **Option B (Manual)**: Go to Storage > Policies and create policies manually:
     - **SELECT**: Allow authenticated users to read their own files
     - **INSERT**: Allow authenticated users to upload to their own folder
     - **UPDATE**: Allow users to update their own files
     - **DELETE**: Allow users to delete their own files
   
   **Important**: Newer policies scope paths by organization; older docs referred to user_id folders.

3. **Run Database Migration:**
   - `npx supabase db push` applies materials schema including `image_url`

4. **Test:**
   - Go to Materials Catalog page
   - Create a new material and upload an image
   - Verify the image displays correctly

