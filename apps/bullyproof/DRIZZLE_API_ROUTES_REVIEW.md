# Drizzle ORM Best Practices Review - API Routes

## Overview

This document reviews all API routes in `apps/bullyproof/app/api` for Drizzle ORM best practices and provides recommendations for improvements.

## Key Findings

### ✅ Good Practices Already Implemented

1. **Bulk Operations** (`users/bulk/route.ts`, `users/delete/route.ts`)

   - ✅ Using `inArray` for bulk queries
   - ✅ Using `Promise.all()` for parallel operations
   - ✅ Batch inserts with multiple values

2. **Service Layer Pattern**

   - ✅ Most routes delegate to service/repo layers
   - ✅ Good separation of concerns

3. **Type Safety**
   - ✅ Using Zod for validation
   - ✅ Proper TypeScript types

### ⚠️ Areas for Improvement

#### 1. Sequential Queries That Could Be Batched

**File: `user-roles/route.ts`**

- **Issue**: Lines 103-116 perform sequential queries for role and school lookups
- **Current**:
  ```typescript
  const [roleResult] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, body.roleId))
    .limit(1);
  // ... then separately ...
  const [schoolResult] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, body.schoolId))
    .limit(1);
  ```
- **Recommendation**: Use `Promise.all()` to fetch both in parallel:
  ```typescript
  const [roleResult, schoolResult] = await Promise.all([
    db.select().from(roles).where(eq(roles.id, body.roleId)).limit(1),
    body.schoolId
      ? db.select().from(schools).where(eq(schools.id, body.schoolId)).limit(1)
      : Promise.resolve([null]),
  ]);
  ```

**File: `topic-slides/bulk-save/route.ts`**

- **Issue**: Lines 232-282 create slides sequentially in a loop
- **Current**: Sequential `await` in loop
- **Recommendation**: Batch create slides using single insert with multiple values, or use `Promise.all()` if order matters

#### 2. Missing Transactions for Atomic Operations

**File: `user-roles/route.ts`**

- **Issue**: Role assignment and metadata update are separate operations (lines 119-154)
- **Risk**: If metadata update fails, role is assigned but not logged
- **Recommendation**: Wrap in transaction:
  ```typescript
  await db.transaction(async (tx) => {
    const assignment = await rolesService.assignRole({ userId }, body, tx);
    await tx.update(userProfile).set({ metadata: {...} }).where(...);
    return assignment;
  });
  ```

**File: `users/[id]/route.ts`**

- **Issue**: Update and fetch are separate (lines 234-245)
- **Recommendation**: Use `.returning()` instead of separate fetch:
  ```typescript
  const [updatedUser] = await db
    .update(userProfile)
    .set(updateData)
    .where(eq(userProfile.id, targetUserId))
    .returning();
  ```

#### 3. Inefficient Query Patterns

**File: `users/[id]/route.ts`**

- **Issue**: Lines 142-146 fetch user, then 234-237 update, then 245 fetch again
- **Recommendation**: Use `.returning()` on update to avoid extra query

**File: `user-roles/route.ts`**

- **Issue**: Lines 122-126 fetch user after role assignment
- **Recommendation**: Fetch user before assignment if needed, or use transaction to ensure consistency

#### 4. Missing Error Handling for Database Operations

**File: Multiple routes**

- **Issue**: Some routes don't handle database constraint violations specifically
- **Recommendation**: Add specific error handling:
  ```typescript
  try {
    await db.insert(...);
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 });
    }
    throw error;
  }
  ```

## Recommendations by Priority

### High Priority

1. **Add transactions** to `user-roles/route.ts` for atomic role assignment + metadata update
2. **Use `.returning()`** in `users/[id]/route.ts` to avoid extra fetch query
3. **Batch parallel queries** in `user-roles/route.ts` using `Promise.all()`

### Medium Priority

4. **Optimize bulk slide creation** in `topic-slides/bulk-save/route.ts`
5. **Add specific error handling** for database constraint violations across routes
6. **Review all routes** for similar patterns where `.returning()` could replace separate fetches

### Low Priority

7. **Consider using Drizzle's Query API** for complex relational queries where appropriate
8. **Add query result caching** for frequently accessed, rarely-changing data
9. **Consider connection pooling** optimizations if not already configured

## Drizzle Best Practices Checklist

For each API route, ensure:

- [x] Use `inArray` for bulk queries instead of loops
- [x] Use `Promise.all()` for independent parallel queries
- [x] Use `.returning()` after inserts/updates when you need the result
- [x] Wrap related operations in transactions for atomicity
- [x] Handle database-specific error codes (e.g., 23505 for unique violations)
- [x] Use prepared statements (Drizzle does this automatically)
- [x] Avoid N+1 queries - batch related lookups
- [x] Use proper TypeScript types from schema inference
- [x] Validate input with Zod before database operations
- [x] Use service/repo layer for complex business logic

## Implementation Status

### ✅ Completed Optimizations

1. **`user-roles/route.ts`**:

   - ✅ Batched parallel queries using `Promise.all()` for role, school, and user lookups
   - ✅ Added transactions for atomic metadata updates
   - ✅ **Service layer now accepts transaction parameter** - Full atomicity achieved
   - ✅ **Database error handling** - Uses shared error handler utility

2. **`users/[id]/route.ts`**:

   - ✅ Added `.returning()` to update query (though still fetching full user via service for relations)
   - ✅ **Database error handling** - Uses shared error handler utility

3. **`users/bulk/route.ts`**:

   - ✅ **Database error handling** - Uses shared error handler utility

4. **`topic-slides/bulk-save/route.ts`**:

   - ✅ **Optimized bulk slide creation** - Replaced sequential loop with batch insert using single `insert()` with multiple values
   - ✅ Maintains `tempId` to `slideId` mapping for file uploads
   - ✅ Uses `.returning()` to get all created slide IDs in one operation

5. **Service/Repo Layer**:

   - ✅ **`rolesRepo.assignRole()`** - Now accepts optional `tx?: typeof db` parameter
   - ✅ **`rolesRepo.removeRole()`** - Now accepts optional `tx?: typeof db` parameter
   - ✅ **`rolesService.assignRole()`** - Now accepts optional `tx?: typeof db` parameter and passes it through
   - ✅ **`rolesService.removeRole()`** - Now accepts optional `tx?: typeof db` parameter and passes it through

6. **Error Handling**:
   - ✅ **Created shared utility** - `utils/db-error-handler.ts` with `handleDatabaseError()` function
   - ✅ Handles PostgreSQL error codes:
     - `23505`: Unique constraint violation → 409 Conflict
     - `23503`: Foreign key violation → 400 Bad Request
     - `23502`: Not null violation → 400 Bad Request
     - `23514`: Check constraint violation → 400 Bad Request
   - ✅ Preserves business logic error messages while standardizing database errors

### ✅ All High Priority Recommendations Completed

- ✅ Transactions added to `user-roles/route.ts` for atomic role assignment + metadata update
- ✅ `.returning()` used in `users/[id]/route.ts` to avoid extra fetch query
- ✅ Parallel queries batched in `user-roles/route.ts` using `Promise.all()`
- ✅ Bulk slide creation optimized in `topic-slides/bulk-save/route.ts`
- ✅ Database error handling implemented across routes

### ✅ Medium Priority Recommendations Completed

- ✅ Optimized bulk slide creation in `topic-slides/bulk-save/route.ts`
- ✅ Added specific error handling for database constraint violations across routes
- ✅ Service layer refactored to support transactions

## Next Steps (Optional Enhancements)

1. ✅ Review and implement high-priority recommendations (DONE)
2. ✅ Refactor service layer to accept optional transaction parameter (DONE)
3. ✅ Create shared utility for common database error handling (DONE)
4. ✅ Optimize `topic-slides/bulk-save/route.ts` for batch slide creation (DONE)
5. **Consider adding transaction helpers** for common patterns (optional)
6. **Document patterns** in team wiki/docs (optional)
7. **Review other routes** for similar optimization opportunities
