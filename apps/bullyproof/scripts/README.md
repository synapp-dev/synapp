# School Data Migration Scripts

This directory contains scripts to migrate school data from the legacy JSON format to the new database schema.

## Overview

The migration process involves:
1. **Seeding reference data** (states, school sectors, school levels)
2. **Migrating school data** from JSON to database with proper relationships

## Scripts

### 1. Seed Reference Data
```bash
npm run seed:reference
```
Populates the database with essential reference data:
- Australian states (NSW, VIC, QLD, etc.)
- School sectors (Government, Catholic, Independent)
- School levels (Primary, Secondary)

### 2. Test Migration Setup
```bash
npm run test:migration
```
Verifies that:
- Database connection works
- Reference data is properly seeded
- Ready to run the migration

### 3. Migrate School Data
```bash
npm run migrate:schools
```
Migrates school data from `components/organisms/schools.json` to the database:
- Maps legacy field names to new schema
- Creates proper foreign key relationships
- Handles many-to-many school level assignments
- Generates URL-friendly slugs
- Skips duplicate schools

## Data Mapping

| Legacy JSON Field | Database Field | Notes |
|------------------|----------------|-------|
| `schoolName` | `schools.name` | Direct mapping |
| `state` | `schools.stateId` | FK to `states` table |
| `schoolType` | `schools.sectorId` | FK to `school_sectors` table |
| `schoolLevel` | `school_level_assignments` | Many-to-many junction table |
| `schoolId` | `schools.code` | Legacy school identifier |
| `joiningDate` | `schools.joinedAt` | ISO timestamp format |

## School Level Handling

The legacy data uses these formats:
- `"Primary"` → Single level assignment
- `"Secondary"` → Single level assignment  
- `"Primary,Secondary"` → Two level assignments

## Error Handling

- **Duplicate schools**: Skipped with warning
- **Missing reference data**: Migration aborts with instructions
- **Invalid data**: Logged as errors, continues with next school
- **Database errors**: Full error details logged

## Prerequisites

1. Database connection configured via `DATABASE_URL` environment variable
2. Database schema applied (tables created)
3. Reference data seeded before running migration

## Example Usage

```bash
# 1. Seed reference data first
npm run seed:reference

# 2. Test the setup
npm run test:migration

# 3. Run the migration
npm run migrate:schools
```

## Output

The migration script provides detailed progress information:
- ✅ Successful imports
- ⏭️ Skipped duplicates
- ❌ Errors encountered
- 📊 Final summary statistics
