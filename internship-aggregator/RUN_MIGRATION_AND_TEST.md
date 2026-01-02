# How to Run Migration and Test Validation

## Step 1: Run the Migration

### Option A: Using Supabase Dashboard (Recommended for Cloud)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/007_add_validation_fields.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)

### Option B: Using Supabase CLI (If you have it set up)

```bash
cd internship-aggregator
supabase db push
```

### Option C: Manual SQL Execution

If you have direct database access, you can run the SQL directly:

```bash
# Read the migration file
cat supabase/migrations/007_add_validation_fields.sql
```

Then execute it in your database client.

## Step 2: Verify Migration

After running the migration, verify the new columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'internships' 
AND column_name LIKE 'validation%' OR column_name = 'is_active';
```

You should see:
- validation_status
- validation_score
- validation_http_code
- validation_final_url
- validation_redirects
- validation_reason
- validation_last_checked
- is_active

## Step 3: Test Validation (Without Updating DB)

### Make sure your dev server is running:

```bash
cd internship-aggregator
npm run dev
```

### Test with a small limit (first 5 records):

```bash
curl "http://localhost:3000/api/validate-pipeline?limit=5" | jq
```

### Test with more records (first 20):

```bash
curl "http://localhost:3000/api/validate-pipeline?limit=20" | jq
```

### Save results to a file:

```bash
curl "http://localhost:3000/api/validate-pipeline?limit=10" -o test-validation-results.json
```

### View summary only:

```bash
curl "http://localhost:3000/api/validate-pipeline?limit=10" | jq '{total, valid, expired, dead, maybe_valid, errors, averageValidationTime}'
```

## Step 4: When Ready, Update Database

Once you're satisfied with the validation results, run with `update=true`:

```bash
# Test with 10 records first
curl "http://localhost:3000/api/validate-pipeline?limit=10&update=true" | jq

# Then run on all records (this will take a while!)
curl "http://localhost:3000/api/validate-pipeline?update=true" | jq
```

## Quick Test Commands

```bash
# 1. Check if server is running
curl http://localhost:3000/api/health

# 2. Test validation on 5 records (no DB update)
curl "http://localhost:3000/api/validate-pipeline?limit=5" | jq '.summary'

# 3. View detailed results for one record
curl "http://localhost:3000/api/validate-pipeline?limit=1" | jq '.results[0]'
```

