# Running migrations safely

Run migrations in the Supabase SQL editor at a quiet time, wrapped like this:

```sql
SET lock_timeout = '5s';        -- give up instead of queueing every app request behind the change
SET statement_timeout = '60s';

-- migration SQL here

NOTIFY pgrst, 'reload schema';  -- let the API see new columns straight away
```

If `lock_timeout` stops the migration, run it again a minute later.

If the app shows a loader forever afterwards:

1. Check Logs > PostgREST in the Supabase dashboard.
2. If it shows `PGRST003 Timed out acquiring connection from connection pool`, restart the project: Project Settings > General > Restart project.
