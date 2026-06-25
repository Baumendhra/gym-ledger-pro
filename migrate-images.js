const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

/**
 * MIGRATION SCRIPT: Supabase Storage Bucket to Supabase Storage Bucket
 * 
 * Instructions:
 * 1. Run `npm install @supabase/supabase-js` in this directory if not already installed.
 * 2. Fill in the old and new Supabase details below.
 * 3. Run `node migrate-images.js`
 */

// --- OLD LOVABLE PROJECT DETAILS ---
const OLD_SUPABASE_URL = 'https://YOUR_OLD_PROJECT_ID.supabase.co';
const OLD_SUPABASE_ANON_KEY = 'YOUR_OLD_ANON_KEY';
const OLD_BUCKET_NAME = 'members'; // Assuming 'members' is the bucket name

// --- NEW SUPABASE PROJECT DETAILS ---
const NEW_SUPABASE_URL = 'https://YOUR_NEW_PROJECT_ID.supabase.co';
// WARNING: You should ideally use the SERVICE ROLE KEY here to bypass RLS for uploading
const NEW_SUPABASE_KEY = 'YOUR_NEW_SERVICE_ROLE_KEY'; 
const NEW_BUCKET_NAME = 'members'; 

const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY);
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

async function migrateImages() {
  console.log(`Starting migration from ${OLD_BUCKET_NAME} to ${NEW_BUCKET_NAME}...`);

  // 1. List all files in the old bucket
  const { data: files, error: listError } = await oldSupabase.storage
    .from(OLD_BUCKET_NAME)
    .list('', { limit: 1000 });

  if (listError) {
    console.error('Error listing files:', listError);
    return;
  }

  if (!files || files.length === 0) {
    console.log('No files found in the old bucket.');
    return;
  }

  console.log(`Found ${files.length} files. Starting transfer...`);

  // Ensure a local temp directory exists
  const tempDir = path.join(process.cwd(), 'temp_migration_images');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    // Skip empty folder placeholders
    if (file.name === '.emptyFolderPlaceholder') continue;
    
    console.log(`[${successCount + failCount + 1}/${files.length}] Processing ${file.name}...`);
    
    try {
      // 2. Download the file
      const { data: fileData, error: downloadError } = await oldSupabase.storage
        .from(OLD_BUCKET_NAME)
        .download(file.name);

      if (downloadError) throw downloadError;

      // Convert Blob to Buffer
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 3. Upload to new bucket
      const { error: uploadError } = await newSupabase.storage
        .from(NEW_BUCKET_NAME)
        .upload(file.name, buffer, {
          contentType: fileData.type,
          upsert: true // Overwrite if it exists
        });

      if (uploadError) throw uploadError;

      console.log(`   ✅ Successfully migrated ${file.name}`);
      successCount++;
    } catch (err) {
      console.error(`   ❌ Failed to migrate ${file.name}:`, err.message || err);
      failCount++;
    }
  }

  console.log('\nMigration Complete!');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  // Cleanup temp dir
  if (fs.existsSync(tempDir)) {
    fs.rmdirSync(tempDir, { recursive: true });
  }
}

migrateImages().catch(console.error);
