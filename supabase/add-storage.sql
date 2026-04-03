-- Create public image storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('sherpa-images', 'sherpa-images', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload images
CREATE POLICY "auth_upload_images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'sherpa-images');

-- Authenticated users can update/replace their own images
CREATE POLICY "auth_update_images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'sherpa-images');

-- Anyone can read images (public bucket)
CREATE POLICY "public_read_images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'sherpa-images');
