# Creative Team Work Tracker — Web App Specification

## 1. Project Goal

Build a production-ready internal web application to replace the team's messy Excel-based weekly reporting system.

The app is for a creative/design team. Team members enter their work **daily**, while the application automatically organizes and aggregates the data into:

- Daily views
- Weekly reports
- Monthly reports
- Yearly reports
- Overall/all-time reports

The weekly view is important because the team has weekly meetings where higher-ups review what each person completed and the person explains the work.

The application should be simple, clean, fast, and easy enough that team members actually use it instead of going back to Excel.

---

## 2. Core Product Principle

### One source of truth

Do NOT create separate databases/tables for daily, weekly, monthly, and yearly reports.

Store the actual work entries with dates.

The application derives:

`Daily Entries → Weekly Aggregation → Monthly Aggregation → Yearly/Overall Aggregation`

If a user corrects a daily entry, every report should automatically reflect the correction.

Do not recreate the Excel structure literally. The Excel sheets are only references for the information the team needs to report.

---

## 3. Hosting / Technology

Recommended stack:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase
  - PostgreSQL database
  - Authentication
  - Row Level Security
- Vercel for deployment
- GitHub for source control
- Optional: Supabase Storage if file uploads are added later

Use environment variables for Supabase credentials.

Never hard-code secrets.

Expected deployment flow:

`GitHub → Vercel → Next.js app → Supabase`

---

## 4. Users

Initial team members:

### Designers

- Varun
- Moveena
- Shashiraj
- Prasanna Lakshmi
- Samantha

### UI/UX

- Fazil
- Gajesh

### Important rule

These designations should NOT restrict what a person can enter.

Everyone must have access to the same work-type options.

A designer may do UI/UX.
A UI/UX designer may make videos.
Everyone should be able to select any valid work type.

The role/designation is informational, not a work-entry restriction.

The system should also support adding future team members without code changes.

---

## 5. Work Types

Initial work-type options:

- Static
- Video
- Mobile App
- Landing Page
- Website
- UI/UX
- Logo
- Edits
- Working
- Other

Make this configurable in the database if practical so new work types can be added later.

Do not hard-code the list throughout the application.

---

## 6. Daily Work Entry

This is the primary data-entry workflow.

A user should be able to create a work entry for a specific date.

Suggested fields:

- Person/user
- Work date
- Client/Brand
- Work type
- Work description
- Created/Done quantity
- Approved quantity
- Best work / work link
- Notes / explanation
- Created timestamp
- Updated timestamp

The UI should make daily entry fast.

The user should be able to add multiple entries for the same day.

Example:

Date: 20 Aug 2026
Person: Gajesh
Client: Longovia
Work Type: Website
Description: Homepage redesign
Done: 3
Approved: 2
Best Work Link: Figma URL
Notes: Homepage revised based on client feedback.

---

## 7. Important Data Rules

### Dates

Every work entry must have a real date.

Do not store only:

- Week 1
- Week 2
- Week 3

Instead store the actual date and derive the week/month/year.

This allows reliable filtering and historical reporting.

### Quantities

Created/Done and Approved should be numeric.

Prevent invalid negative quantities.

Approved should normally not exceed Done, but consider whether the business may need to allow exceptions later.

### Links

Validate URLs where appropriate.

### Auditability

Store created_at and updated_at timestamps.

Prefer immutable historical records where possible, but users must be able to correct mistakes.

---

## 8. Weekly Reporting

The app needs a dedicated weekly reporting view because weekly meetings are a core business workflow.

The weekly report should automatically aggregate all daily entries within the selected week.

Example:

### Gajesh — Week of Aug 17–23

Static:
- Created: 8
- Approved: 6

Video:
- Created: 3
- Approved: 2

Website:
- Created: 5
- Approved: 4

Total:
- Created: 16
- Approved: 12

The weekly view should also allow higher-ups/team members to see the underlying individual entries and explanations.

Do NOT manually enter weekly totals.

---

## 9. Monthly Reporting

Monthly reports must be automatically calculated from the underlying daily entries.

Example:

### August 2026 — Gajesh

| Work Type | Created | Approved |
|---|---:|---:|
| Static | 35 | 28 |
| Video | 10 | 8 |
| Website | 3 | 3 |

Also show total created and total approved.

The user should be able to select:

- Person
- Month
- Year

---

## 10. Overall / All-Time Reporting

Provide an overall reporting view.

Useful filters:

- Person
- Work type
- Client
- Date range
- Year
- Month

Examples:

- Entire team — August 2026
- Gajesh — August 2026
- Fazil — 2026
- Entire team — all time
- All videos — August
- All work for a particular client

---

## 11. Dashboard

The dashboard should provide a quick overview.

Possible sections:

### Today's Activity

- Entries today
- Work completed today
- Approvals today

### This Week

- Total created
- Total approved
- Number of contributors
- Breakdown by work type

### This Month

- Total created
- Total approved
- Team activity
- Work-type breakdown

### Recent Entries

Show the latest submitted work.

### Quick Actions

- Add Work
- View This Week
- View This Month
- View Team Report

Keep the dashboard uncluttered.

---

## 12. Search and Filters

Filtering is a major requirement.

Provide filters for:

- Date
- Date range
- Week
- Month
- Year
- Person
- Work type
- Client
- Approval status if implemented

The user should be able to combine filters.

Example:

`August 2026 + Gajesh + Video`

and immediately see the relevant data and totals.

---

## 13. Weekly Meeting Workflow

Typical workflow:

1. Team members enter work throughout the week.
2. Data is saved immediately to Supabase.
3. At the weekly meeting, open the selected week.
4. The system shows each person's totals.
5. Higher-ups can inspect the underlying entries.
6. Team member explains the work using descriptions, notes, and links.
7. The weekly report remains available historically.

The weekly report should be easy to present on a screen.

---

## 14. Submission / Review Status

Keep this simple.

Suggested states:

- Draft
- Submitted
- Reviewed
- Needs Changes

However, do not over-engineer this initially.

If the team does not need formal approval workflow, the application can simply save entries and provide a reviewed marker later.

There should NOT be a complicated admin panel.

---

## 15. Permissions / Visibility

The user explicitly does NOT want a traditional complicated admin panel.

The application is internal to the team.

Team members should be able to see shared reporting data.

However, authentication should still exist so the application is not publicly editable.

Recommended initial model:

- Authenticated team members can log in.
- Team members can view team reports.
- Team members can create/edit their own entries.
- Avoid exposing the database publicly.
- Use Supabase Row Level Security.

If a future manager/admin permission is needed, design the schema so it can be added without rewriting the application.

---

## 16. Authentication

Use Supabase Auth.

Preferred initial approach:

- Email/password or magic-link authentication
- User profile table linked to auth.users
- Team member record contains:
  - id
  - auth_user_id
  - name
  - designation
  - active status

Do not assume the display name from the email address.

The seeded team members should be represented in the database.

---

## 17. Recommended Database Design

Use PostgreSQL through Supabase.

Suggested tables:

### profiles

- id
- auth_user_id
- name
- designation
- email
- is_active
- created_at
- updated_at

### clients

- id
- name
- is_active
- created_at
- updated_at

### work_types

- id
- name
- is_active
- created_at
- updated_at

### work_entries

- id
- user_id
- client_id
- work_date
- work_type_id
- description
- quantity_done
- quantity_approved
- best_work_url
- notes
- status
- created_at
- updated_at

Potentially add:

- reviewed_at
- reviewed_by

only if review workflow is implemented.

Do not create separate weekly/monthly tables unless there is a concrete performance requirement later.

Use SQL views or application queries for reporting.

---

## 18. Database Constraints

Implement sensible constraints.

Examples:

- quantity_done >= 0
- quantity_approved >= 0
- work_date NOT NULL
- work_type NOT NULL
- user NOT NULL
- client should be required if business workflow requires it
- URL fields should be validated
- names should be unique where appropriate

Use foreign keys.

Use indexes for common reporting queries:

- work_date
- user_id
- work_type_id
- client_id

Composite indexes can be added based on actual query patterns.

---

## 19. Supabase Row Level Security

RLS is required.

Do not disable security simply because the app is internal.

Recommended policies:

### Read

Authenticated team members can read relevant team reporting data.

### Insert

Authenticated users can insert entries associated with themselves.

### Update

Users can update their own entries.

### Delete

Avoid unrestricted deletion.

If deletion is needed, consider soft-delete or restrict it appropriately.

The service role key must never be exposed in client-side code.

---

## 20. Reporting Queries

The application should calculate reports from work_entries.

Examples:

### Weekly

Filter:

`work_date >= week_start AND work_date <= week_end`

Group by:

- user
- work_type

Sum:

- quantity_done
- quantity_approved

### Monthly

Filter by month date range.

Group by:

- user
- work_type

### Overall

Same underlying data with no date restriction or a selected date range.

Prefer date-range queries over functions that prevent indexes from being used.

---

## 21. UI / UX Direction

The visual design should be clean, modern, professional, and minimal.

### Primary color direction

Mostly white.

Use subtle hints of Webtree-style green and blue gradient.

The gradient should be an accent, NOT the dominant background.

Suggested usage:

- Primary buttons
- Selected navigation
- Small dashboard highlights
- Chart accents
- Logo/branding accents
- Active states

Avoid a UI where every card or section is brightly colored.

### General style

- White background
- Dark charcoal text
- Subtle gray borders
- Light shadows
- Rounded but not excessive cards
- Clean typography
- Plenty of whitespace
- Professional SaaS dashboard feel

The application should feel like a modern internal product, NOT like a redesigned Excel spreadsheet.

---

## 22. Suggested App Structure

Suggested routes:

`/login`

`/dashboard`

`/work`

`/work/new`

`/work/[id]`

`/reports`

`/reports/weekly`

`/reports/monthly`

`/reports/overall`

`/team`

Potentially:

`/settings`

but only if actually needed.

Navigation should remain simple.

Suggested primary navigation:

- Dashboard
- My Work
- Team
- Reports

And a prominent:

**+ Add Work**

button.

---

## 23. Work Entry UX

Make adding work extremely fast.

Possible layout:

### Add Work

Date
Client
Work Type
Description
Done
Approved
Best Work Link
Notes

Actions:

- Save
- Save & Add Another
- Cancel

After saving, show confirmation.

The user should not have to navigate through multiple pages just to add one entry.

---

## 24. Daily View

Show:

### My Work Today

List of entries for today.

Each row/card:

- Client
- Work type
- Description
- Done
- Approved
- Status
- Edit

Also show:

**Today's Total**

- Created
- Approved

Allow changing the date to inspect previous days.

---

## 25. Weekly View

Show:

- Selected week
- Person breakdown
- Work-type breakdown
- Total created
- Total approved
- Underlying daily entries

Make it presentation-friendly for meetings.

Potential controls:

`← Previous Week | This Week | Next Week →`

---

## 26. Monthly View

Show:

- Month selector
- Year selector
- Person filter
- Work-type filter
- Client filter
- Totals
- Breakdown table
- Optional charts

---

## 27. Overall View

Show long-term performance.

Useful options:

- All time
- Current year
- Previous year
- Custom date range

Allow grouping by:

- Person
- Work type
- Client

---

## 28. Charts

Charts are useful but should not dominate the application.

Possible charts:

- Created vs Approved
- Work type distribution
- Weekly activity
- Monthly activity
- Person comparison

Always retain a table beneath/near the chart so the exact numbers are accessible.

---

## 29. Data Export

Consider adding CSV export after the core application works.

Possible exports:

- Current filtered view
- Weekly report
- Monthly report
- Overall report

Do not make export a blocker for the first version.

---

## 30. Seed Data

Seed:

### Team

Varun
Moveena
Shashiraj
Prasanna Lakshmi
Samantha
Fazil
Gajesh

Also create a configurable mechanism for adding the user/developer/owner and future team members.

### Work Types

Static
Video
Mobile App
Landing Page
Website
UI/UX
Logo
Edits
Working
Other

---

## 31. Important Non-Goals

Do NOT initially build:

- Complicated admin panel
- Payroll
- HR management
- Performance scoring
- Automated employee ranking
- Complex approval hierarchy
- Separate weekly database
- Separate monthly database
- Excel-like giant spreadsheet UI
- Excessive notifications
- Over-engineered permissions

Build the useful core first.

---

## 32. Future Features

Design the architecture so these can be added later:

- File/image attachments
- Slack/email notifications
- Manager review
- Comments on entries
- Team announcements
- CSV/Excel export
- PDF weekly reports
- Client-level reporting
- Productivity trends
- Dashboard customization

Do not implement these unless explicitly requested.

---

## 33. Development Requirements

Use:

- TypeScript
- Strict typing
- Reusable components
- Server-side validation where appropriate
- Client-side validation for UX
- Supabase migrations
- Seed scripts
- Environment variables
- Proper error handling
- Loading states
- Empty states
- Responsive design

The application should work well on:

- Desktop
- Laptop
- Tablet
- Mobile

Desktop is the primary environment.

---

## 34. Error / Empty States

Handle cases such as:

- No entries today
- No work for selected week
- No data for selected month
- Invalid URL
- Failed database request
- Authentication failure
- User not found
- Client not found

Never show a blank broken page.

---

## 35. Performance

The app should remain fast as the number of entries grows.

Use:

- Proper indexes
- Paginated entry lists where necessary
- Efficient date-range queries
- Server components where appropriate
- Cached/static UI where appropriate
- Avoid fetching the entire database just to calculate a dashboard

Do not prematurely over-optimize.

---

## 36. Security

Never expose:

- Supabase service role key
- Database credentials
- Private environment variables

Use:

- Supabase Auth
- RLS
- Input validation
- Authorization checks
- Secure server-side operations

Do not trust user IDs supplied by the client.

---

## 37. Build Order

Build in this order:

### Phase 1 — Foundation

1. Initialize Next.js + TypeScript
2. Configure Tailwind
3. Configure Supabase
4. Create environment variables
5. Create database migrations
6. Configure RLS
7. Create authentication
8. Create profile/team structure

### Phase 2 — Core Data Entry

9. Work types
10. Clients
11. Daily work-entry form
12. My Work page
13. Edit work entry
14. Validation

### Phase 3 — Reporting

15. Dashboard
16. Weekly report
17. Monthly report
18. Overall report
19. Filters
20. Charts/tables

### Phase 4 — Polish

21. Responsive design
22. Loading states
23. Empty states
24. Error handling
25. CSV export
26. UX refinement
27. Deployment to Vercel

---

## 38. Definition of Done

The first production-ready version is complete when:

- A team member can log in.
- A team member can enter work daily.
- Every entry is saved to Supabase.
- Everyone can view shared reporting data according to permissions.
- Work types are selectable from a dropdown.
- Users are not restricted to their designation's work type.
- Weekly totals are automatically calculated from dates.
- Monthly totals are automatically calculated from dates.
- Overall totals are automatically calculated.
- Reports can be filtered by person/date/work type/client.
- Weekly reports are suitable for the team's weekly meeting.
- Historical data remains available.
- Editing an old entry updates all relevant reports.
- There is no dependency on Excel formulas.
- The application is deployed through GitHub/Vercel.
- Supabase credentials are secure.
- RLS is enabled.

---

## 39. Agent Instructions

You are building a real internal application, not a mockup.

Do not merely create static dashboard screens with fake numbers.

Create the actual Supabase schema, migrations, authentication, CRUD operations, reporting queries, and UI.

Start by creating the database schema and application architecture.

Use realistic seed data only for development/demo purposes.

Keep the code modular.

When a requirement is ambiguous, prefer the simplest architecture that preserves the ability to extend later.

Most importantly:

**Daily work entries are the source of truth.**

Everything else is a view/aggregation of those entries.

Do not recreate the Excel spreadsheet architecture inside the database.
