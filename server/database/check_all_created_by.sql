-- Check all tables that might have created_by columns
SELECT 
    table_name,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE column_name = 'created_by'
ORDER BY table_name, ordinal_position;

-- Check if maps.created_by has the same issue
SELECT 'maps.created_by type:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'maps' AND column_name = 'created_by';

-- Check if preview_images.created_by has the same issue  
SELECT 'preview_images.created_by type:' as info;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'preview_images' AND column_name = 'created_by';
