# Supabase Migrations

This directory contains SQL migration files for the Cathexis Dashboard database schema.

## Database Schema

### Tables

#### `mvr_device_groups`
Stores device groups for organizing devices.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key (auto-increment) |
| created_at | timestamp | Record creation timestamp |
| name | text | Group name (required) |
| description | text | Group description (optional) |

#### `mvr_devices`
Stores dashcam device information.

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key (auto-increment) |
| created_at | timestamp | Record creation timestamp |
| serial | text | Device serial number |
| client_id | bigint | Client identifier |
| friendly_name | text | Human-readable device name |
| status | text | Device status (online, offline, warning, maintenance) |
| group_id | bigint | Foreign key to mvr_device_groups table |

### Row Level Security (RLS)

Both tables have RLS enabled with the following policies:

**Public Access:**
- Anyone can read (SELECT) from both tables

**Authenticated Users:**
- Can INSERT, UPDATE, and DELETE records in both tables

### Indexes

For performance optimization:
- `mvr_devices_group_id_idx` - Index on group_id for faster joins
- `mvr_devices_status_idx` - Index on status for faster filtering
- `mvr_devices_serial_idx` - Index on serial for faster lookups

## Running Migrations

### Option 1: Supabase CLI (Recommended)

If you have the Supabase CLI installed:

```bash
# Initialize Supabase project (first time only)
supabase init

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 2: Manual SQL Execution

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `migrations/20241126_initial_schema.sql`
4. Click "Run" to execute the migration

### Option 3: Supabase Dashboard Migration Tool

1. Go to Database → Migrations in your Supabase dashboard
2. Create a new migration
3. Paste the SQL content
4. Run the migration

## Testing

After running the migration, you can verify the tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('mvr_devices', 'mvr_device_groups');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('mvr_devices', 'mvr_device_groups');
```

## Example Data

To test the schema, you can insert sample data:

```sql
-- Insert a group
INSERT INTO public.mvr_device_groups (name, description)
VALUES ('Main Building', 'Cameras in the main building');

-- Insert devices
INSERT INTO public.mvr_devices (serial, friendly_name, status, group_id)
VALUES 
  ('CAM-2024-001', 'Main Entrance Camera', 'online', 1),
  ('CAM-2024-002', 'Parking Lot Camera', 'online', 1),
  ('CAM-2024-003', 'Warehouse Camera', 'offline', 1);
```

