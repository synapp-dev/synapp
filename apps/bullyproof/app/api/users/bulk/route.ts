/**
 * Bulk User Creation API route handler.
 *
 * Exposes HTTP endpoint for creating multiple users in bulk.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for creating users.
 *
 * Endpoints:
 * - POST /api/users/bulk - Create multiple users with roles
 *
 * Responses:
 * - 201 Created: Returns the created users data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { checkFeatureAccess } from "@/server/features/features.service";
import { createServerAdminClient } from "@/utils/supabase/admin";
import { rolesRepo } from "@/server/roles/roles.repo";
import { db } from "@/server/db/drizzle";
import {
  userProfile,
  scopes,
  roles,
  schools,
  userRoles,
  userSchoolPositions,
} from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { handleDatabaseError } from "@/utils/db-error-handler";

type UpdateLog = {
  type?: "creation" | "update";
  updatedAt: string;
  updatedBy: string;
  changes?: Array<{
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }>;
};

type UserMetadata = {
  updateLogs?: UpdateLog[];
  roleLogs?: unknown[];
  [key: string]: unknown;
};

// Request body schema for bulk creation
const bulkUserSchema = z.object({
  schoolId: z.uuid(),
  users: z.array(
    z.object({
      email: z.string().email(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      apTeacher: z.boolean().optional(),
      position: z.string().optional(),
    })
  ),
});

/**
 * Handle POST /api/users/bulk
 *
 * Creates multiple users in bulk and assigns them roles.
 * Only platform admins can create users.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the creation results or an error payload.
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("[BULK USER CREATE] ====== START ======");

  try {
    // Step 1: Get user ID
    console.log("[BULK USER CREATE] Step 1: Getting user ID from request...");
    let userId: string;
    try {
      userId = await getUserIdFromRequest(request);
      console.log("[BULK USER CREATE] Step 1: Success, userId:", userId);
    } catch (error: any) {
      console.error("[BULK USER CREATE] Step 1: Failed to get user ID:", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!userId) {
      console.error("[BULK USER CREATE] Step 1: No userId returned");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Parse request body
    console.log("[BULK USER CREATE] Step 2: Parsing request body...");
    let body: any;
    try {
      body = await request.json();
      console.log("[BULK USER CREATE] Step 2: Success, body parsed:", {
        userCount: body.users?.length || 0,
        schoolId: body.schoolId,
        hasUsers: !!body.users,
      });
    } catch (error: any) {
      console.error("[BULK USER CREATE] Step 2: Failed to parse JSON:", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Step 3: Validate request body
    console.log("[BULK USER CREATE] Step 3: Validating request body...");
    let data: z.infer<typeof bulkUserSchema>;
    try {
      data = bulkUserSchema.parse(body);
      console.log("[BULK USER CREATE] Step 3: Success, validated:", {
        userCount: data.users.length,
        schoolId: data.schoolId,
      });
    } catch (error: any) {
      console.error("[BULK USER CREATE] Step 3: Validation failed:", {
        error: error.message,
        errors: error.errors,
        name: error.name,
      });
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors || error.message,
        },
        { status: 400 }
      );
    }

    // Step 4: Check permissions
    console.log("[BULK USER CREATE] Step 4: Checking permissions...");
    const hasAdminUsers = await checkFeatureAccess(userId, "/admin/users");
    if (!hasAdminUsers) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Step 5: Get school info
    console.log("[BULK USER CREATE] Step 5: Getting school info...");
    let schoolResult: any;
    try {
      const schoolQuery = await db
        .select()
        .from(schools)
        .where(eq(schools.id, data.schoolId))
        .limit(1);
      schoolResult = schoolQuery[0];
      console.log("[BULK USER CREATE] Step 5: Success, school:", {
        id: schoolResult?.id,
        name: schoolResult?.name,
      });
    } catch (error: any) {
      console.error("[BULK USER CREATE] Step 5: Failed to get school:", {
        error: error.message,
        stack: error.stack,
        schoolId: data.schoolId,
      });
      return NextResponse.json(
        { error: `Failed to fetch school: ${error.message}` },
        { status: 500 }
      );
    }

    if (!schoolResult) {
      console.error("[BULK USER CREATE] Step 5: School not found:", {
        schoolId: data.schoolId,
      });
      return NextResponse.json(
        { error: `School with ID '${data.schoolId}' not found` },
        { status: 400 }
      );
    }

    // Step 6: Get role IDs
    console.log("[BULK USER CREATE] Step 6: Getting role IDs...");
    let schoolScope: any[];
    try {
      schoolScope = await db
        .select()
        .from(scopes)
        .where(eq(scopes.name, "school"))
        .limit(1);
      console.log("[BULK USER CREATE] Step 6a: School scope:", {
        found: schoolScope.length > 0,
        scopeId: schoolScope[0]?.id,
      });
    } catch (error: any) {
      console.error("[BULK USER CREATE] Step 6a: Failed to get scope:", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        { error: `Failed to fetch school scope: ${error.message}` },
        { status: 500 }
      );
    }

    if (schoolScope.length === 0) {
      console.error("[BULK USER CREATE] Step 6a: School scope not found");
      return NextResponse.json(
        { error: "School scope not found" },
        { status: 500 }
      );
    }

    let staffRole: any[];
    try {
      staffRole = await db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.key, "SCHOOL_STAFF"),
            eq(roles.scopeId, schoolScope[0].id)
          )
        )
        .limit(1);
      console.log("[BULK USER CREATE] Step 6b: Staff role:", {
        found: staffRole.length > 0,
        roleId: staffRole[0]?.id,
        roleName: staffRole[0]?.name,
        roleKey: staffRole[0]?.key,
      });
    } catch (error: any) {
      console.error("[BULK USER CREATE] Step 6b: Failed to get staff role:", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        { error: `Failed to fetch staff role: ${error.message}` },
        { status: 500 }
      );
    }

    if (staffRole.length === 0) {
      console.error("[BULK USER CREATE] Step 6b: SCHOOL_STAFF role not found");
      return NextResponse.json(
        { error: "SCHOOL_STAFF role not found" },
        { status: 500 }
      );
    }

    let teacherRole: any[];
    try {
      teacherRole = await db
        .select()
        .from(roles)
        .where(
          and(eq(roles.key, "TEACHER"), eq(roles.scopeId, schoolScope[0].id))
        )
        .limit(1);
      console.log("[BULK USER CREATE] Step 6c: Teacher role:", {
        found: teacherRole.length > 0,
        roleId: teacherRole[0]?.id,
        roleName: teacherRole[0]?.name,
        roleKey: teacherRole[0]?.key,
      });
    } catch (error: any) {
      console.error("[BULK USER CREATE] Step 6c: Failed to get teacher role:", {
        error: error.message,
        stack: error.stack,
      });
      // Non-fatal, continue without teacher role
      console.warn(
        "[BULK USER CREATE] Step 6c: Continuing without teacher role"
      );
    }

    // Step 7: Create admin client
    console.log("[BULK USER CREATE] Step 7: Creating admin client...");
    let adminClient: any;
    try {
      adminClient = await createServerAdminClient();
      console.log("[BULK USER CREATE] Step 7: Success, admin client created");
    } catch (error: any) {
      console.error(
        "[BULK USER CREATE] Step 7: Failed to create admin client:",
        {
          error: error.message,
          stack: error.stack,
        }
      );
      return NextResponse.json(
        { error: `Failed to create admin client: ${error.message}` },
        { status: 500 }
      );
    }

    // Step 8: Fetch ALL existing users (handle pagination)
    console.log("[BULK USER CREATE] Step 8: Fetching all existing users...");
    const existingUsersMap = new Map<string, { id: string; email?: string }>();
    let page = 1;
    let hasMore = true;
    let totalPagesFetched = 0;

    try {
      while (hasMore) {
        console.log(`[BULK USER CREATE] Step 8: Fetching page ${page}...`);
        const { data: pageData, error: listUsersError } =
          await adminClient.auth.admin.listUsers({
            page,
            perPage: 1000, // Max per page
          });

        if (listUsersError) {
          console.error(
            `[BULK USER CREATE] Step 8: Failed to list users on page ${page}:`,
            {
              error: listUsersError.message,
              code: listUsersError.code,
              status: listUsersError.status,
            }
          );
          return NextResponse.json(
            {
              error: `Failed to check existing users on page ${page}: ${listUsersError.message}`,
            },
            { status: 500 }
          );
        }

        if (!pageData) {
          console.error(
            `[BULK USER CREATE] Step 8: No data returned for page ${page}`
          );
          break;
        }

        // Add users from this page to the map
        const usersOnPage = pageData.users || [];
        let addedCount = 0;
        usersOnPage.forEach((u: { id: string; email?: string }) => {
          if (u.email) {
            existingUsersMap.set(u.email.toLowerCase(), u);
            addedCount++;
          }
        });

        console.log(
          `[BULK USER CREATE] Step 8: Page ${page} - ${usersOnPage.length} users, ${addedCount} with emails (Total cached: ${existingUsersMap.size})`
        );

        // Check if there are more pages
        hasMore = usersOnPage.length === 1000;
        page++;
        totalPagesFetched++;

        // Safety limit to prevent infinite loops
        if (page > 1000) {
          console.error(
            "[BULK USER CREATE] Step 8: Safety limit reached (1000 pages)"
          );
          break;
        }
      }

      console.log(
        `[BULK USER CREATE] Step 8: Finished fetching. Total pages: ${totalPagesFetched}, Total existing users in cache: ${existingUsersMap.size}`
      );
    } catch (error: any) {
      console.error(
        "[BULK USER CREATE] Step 8: Exception during user fetching:",
        {
          error: error.message,
          stack: error.stack,
          page,
          totalCached: existingUsersMap.size,
        }
      );
      return NextResponse.json(
        { error: `Failed to fetch existing users: ${error.message}` },
        { status: 500 }
      );
    }

    // Step 9: Check for duplicates in incoming data
    console.log(
      "[BULK USER CREATE] Step 9: Checking for duplicates in incoming data..."
    );
    const incomingEmails = new Map<string, number>();
    const duplicateEmails: string[] = [];

    try {
      data.users.forEach((user, index) => {
        if (!user.email) {
          console.warn(
            `[BULK USER CREATE] Step 9: User at index ${index} has no email`
          );
          return;
        }
        const emailLower = user.email.toLowerCase();
        const count = incomingEmails.get(emailLower) || 0;
        incomingEmails.set(emailLower, count + 1);
        if (count > 0 && !duplicateEmails.includes(emailLower)) {
          duplicateEmails.push(emailLower);
        }
      });
      console.log(
        `[BULK USER CREATE] Step 9: Success. Found ${duplicateEmails.length} duplicate emails in incoming data`
      );
    } catch (error: any) {
      console.error("[BULK USER CREATE] Step 9: Failed to check duplicates:", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        { error: `Failed to check duplicates: ${error.message}` },
        { status: 500 }
      );
    }

    // Step 10: Process users and categorize them
    console.log("[BULK USER CREATE] Step 10: Categorizing users...");
    const newUsers: typeof data.users = [];
    const existingUsers: Array<{
      user: (typeof data.users)[0];
      userId: string;
    }> = [];

    try {
      data.users.forEach((user, index) => {
        if (!user.email) {
          console.warn(
            `[BULK USER CREATE] Step 10: Skipping user at index ${index} (no email)`
          );
          return;
        }
        const emailLower = user.email.toLowerCase();
        const existingUser = existingUsersMap.get(emailLower);

        if (existingUser) {
          existingUsers.push({ user, userId: existingUser.id });
        } else {
          newUsers.push(user);
        }
      });
      console.log(
        `[BULK USER CREATE] Step 10: Success. New: ${newUsers.length}, Existing: ${existingUsers.length}`
      );
    } catch (error: any) {
      console.error("[BULK USER CREATE] Step 10: Failed to categorize users:", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        { error: `Failed to categorize users: ${error.message}` },
        { status: 500 }
      );
    }

    // Step 11: Actually create/update users and assign roles
    console.log("[BULK USER CREATE] Step 11: Creating/updating users...");
    console.log(`\n=== BULK USER CREATION ===`);
    console.log(`School: ${schoolResult.name} (ID: ${data.schoolId})`);
    console.log(`Total users to process: ${data.users.length}`);
    console.log(`New users: ${newUsers.length}`);
    console.log(`Existing users: ${existingUsers.length}`);
    console.log(`Duplicates: ${duplicateEmails.length}`);

    const results: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Batch check for existing profiles by user IDs using inArray
    const batchCheckProfiles = async (userIds: string[]) => {
      if (userIds.length === 0)
        return new Map<string, typeof userProfile.$inferSelect>();

      try {
        // Use inArray to query all profiles at once
        const profiles = await db
          .select()
          .from(userProfile)
          .where(inArray(userProfile.id, userIds));

        const profilesMap = new Map<string, typeof userProfile.$inferSelect>();
        profiles.forEach((profile) => {
          profilesMap.set(profile.id, profile);
        });

        return profilesMap;
      } catch (error: any) {
        console.error(
          "[BULK USER CREATE] Error in batch profile check:",
          error.message
        );
        // Fallback to individual queries if batch fails
        const profilesMap = new Map<string, typeof userProfile.$inferSelect>();
        for (const userId of userIds) {
          try {
            const [profile] = await db
              .select()
              .from(userProfile)
              .where(eq(userProfile.id, userId))
              .limit(1);
            if (profile) {
              profilesMap.set(userId, profile);
            }
          } catch (err: any) {
            console.error(
              `[BULK USER CREATE] Error checking profile for ${userId}:`,
              err.message
            );
          }
        }
        return profilesMap;
      }
    };

    // Batch check for existing roles using inArray
    const batchCheckRoles = async (
      userIds: string[],
      roleId: string,
      schoolId: string
    ) => {
      if (userIds.length === 0) return new Set<string>();

      try {
        // Use inArray to query all roles at once
        const existingRoles = await db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(
            and(
              inArray(userRoles.userId, userIds),
              eq(userRoles.roleId, roleId),
              eq(userRoles.schoolId, schoolId)
            )
          );

        return new Set(existingRoles.map((r) => r.userId));
      } catch (error: any) {
        console.error(
          "[BULK USER CREATE] Error in batch role check:",
          error.message
        );
        // Fallback to individual queries if batch fails
        const usersWithRole = new Set<string>();
        for (const userId of userIds) {
          try {
            const existingRole = await rolesRepo.hasRole(
              userId,
              roleId,
              schoolId
            );
            if (existingRole.length > 0) {
              usersWithRole.add(userId);
            }
          } catch (err: any) {
            console.error(
              `[BULK USER CREATE] Error checking role for ${userId}:`,
              err.message
            );
          }
        }
        return usersWithRole;
      }
    };

    // Batch check for existing positions using inArray
    const batchCheckPositions = async (
      userIds: string[],
      schoolId: string
    ) => {
      if (userIds.length === 0) return new Map<string, Set<string>>();

      try {
        // Use inArray to query all positions at once
        const existingPositions = await db
          .select({
            userId: userSchoolPositions.userId,
            position: userSchoolPositions.position,
          })
          .from(userSchoolPositions)
          .where(
            and(
              inArray(userSchoolPositions.userId, userIds),
              eq(userSchoolPositions.schoolId, schoolId)
            )
          );

        // Create a map of userId -> Set of positions
        const positionsMap = new Map<string, Set<string>>();
        existingPositions.forEach((pos) => {
          if (!positionsMap.has(pos.userId)) {
            positionsMap.set(pos.userId, new Set());
          }
          positionsMap.get(pos.userId)!.add(pos.position);
        });

        return positionsMap;
      } catch (error: any) {
        console.error(
          "[BULK USER CREATE] Error in batch position check:",
          error.message
        );
        // Fallback to empty map if batch fails
        return new Map<string, Set<string>>();
      }
    };

    // Batch create positions for users
    const batchCreatePositions = async (
      positions: Array<{ userId: string; position: string }>,
      schoolId: string
    ) => {
      if (positions.length === 0) return;

      try {
        // Filter out positions with empty values
        const validPositions = positions.filter(
          (p) => p.position && p.position.trim().length > 0
        );

        if (validPositions.length === 0) return;

        // Get unique user IDs to check
        const userIds = Array.from(
          new Set(validPositions.map((p) => p.userId))
        );

        // Batch check existing positions
        const existingPositionsMap = await batchCheckPositions(
          userIds,
          schoolId
        );

        // Filter out positions that already exist
        const positionsToInsert = validPositions.filter((p) => {
          const existingPositions = existingPositionsMap.get(p.userId);
          if (!existingPositions) return true;
          return !existingPositions.has(p.position.trim());
        });

        if (positionsToInsert.length === 0) {
          console.log(
            `[BULK USER CREATE] All positions already exist, skipping insert`
          );
          return;
        }

        // Batch insert positions
        console.log(
          `[BULK USER CREATE] Batch inserting ${positionsToInsert.length} positions...`
        );
        await db.insert(userSchoolPositions).values(
          positionsToInsert.map((p) => ({
            userId: p.userId,
            schoolId,
            position: p.position.trim(),
          }))
        );
        console.log(
          `[BULK USER CREATE] Successfully batch inserted ${positionsToInsert.length} positions`
        );
      } catch (error: any) {
        console.error(
          `[BULK USER CREATE] Error in batch position creation:`,
          error.message
        );
        // Don't throw - position creation failure shouldn't fail user creation
        // Fallback to individual inserts for better error handling
        const validPositions = positions.filter(
          (p) => p.position && p.position.trim().length > 0
        );
        for (const pos of validPositions) {
          try {
            const existingPositionsMap = await batchCheckPositions(
              [pos.userId],
              schoolId
            );
            const existingPositions = existingPositionsMap.get(pos.userId);
            if (
              !existingPositions ||
              !existingPositions.has(pos.position.trim())
            ) {
              await db.insert(userSchoolPositions).values({
                userId: pos.userId,
                schoolId,
                position: pos.position.trim(),
              });
            }
          } catch (err: any) {
            // Log but don't fail - position creation is non-critical
            console.error(
              `[BULK USER CREATE] Failed to create position for user ${pos.userId}:`,
              err.message
            );
          }
        }
      }
    };

    // Process new users
    console.log(
      `\n[BULK USER CREATE] Creating ${newUsers.length} new users...`
    );

    // Step 1: Create all users in auth (must be sequential due to Supabase API)
    const createdUsers: Array<{ user: (typeof newUsers)[0]; userId: string }> =
      [];
    const failedUsers: Array<{ user: (typeof newUsers)[0]; error: string }> =
      [];

    for (let i = 0; i < newUsers.length; i++) {
      const user = newUsers[i];
      try {
        // Create user in auth
        const { data: newUser, error: createError } =
          await adminClient.auth.admin.createUser({
            email: user.email,
            email_confirm: true,
          });

        if (createError || !newUser.user) {
          // Check if error is due to user already existing
          const errorMessage =
            createError?.message || "Failed to create user: No user returned";
          if (
            errorMessage.includes("already registered") ||
            errorMessage.includes("already exists") ||
            errorMessage.includes("User already registered")
          ) {
            failedUsers.push({
              user,
              error: `User with email ${user.email} already exists`,
            });
            continue;
          }
          failedUsers.push({ user, error: errorMessage });
          continue;
        }

        createdUsers.push({ user, userId: newUser.user.id });

        if ((i + 1) % 10 === 0) {
          console.log(
            `[BULK USER CREATE] Created ${i + 1}/${newUsers.length} users in auth...`
          );
        }
      } catch (error: any) {
        console.error(
          `[BULK USER CREATE] Failed to create user ${user.email}:`,
          error.message
        );
        failedUsers.push({
          user,
          error: error.message || "Failed to create user",
        });
      }
    }

    // Step 2: Wait for triggers to create profiles, then batch check them
    if (createdUsers.length > 0) {
      console.log(`[BULK USER CREATE] Waiting for profile triggers...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const userIdsToCheck = createdUsers.map((cu) => cu.userId);
      console.log(
        `[BULK USER CREATE] Batch checking ${userIdsToCheck.length} profiles...`
      );
      const existingProfilesMap = await batchCheckProfiles(userIdsToCheck);

      // Step 3: Batch create/update profiles
      const profilesToCreate: Array<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        metadata: any;
      }> = [];
      const profilesToUpdate: Array<{
        userId: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        metadata: any;
      }> = [];

      for (const { user, userId } of createdUsers) {
        const existingProfile = existingProfilesMap.get(userId);

        if (!existingProfile) {
          // Profile doesn't exist - prepare for batch insert
          profilesToCreate.push({
            id: userId,
            email: user.email,
            firstName:
              user.firstName && user.firstName.trim()
                ? user.firstName.trim()
                : null,
            lastName:
              user.lastName && user.lastName.trim()
                ? user.lastName.trim()
                : null,
            metadata: {
              updateLogs: [
                {
                  type: "creation",
                  updatedAt: new Date().toISOString(),
                  updatedBy: userId,
                },
              ],
            },
          });
        } else {
          // Profile exists - prepare for batch update
          const currentMetadata =
            (existingProfile.metadata as UserMetadata | null) ||
            ({} as UserMetadata);
          const updateLogs = Array.isArray(currentMetadata.updateLogs)
            ? currentMetadata.updateLogs
            : [];
          const hasCreationLog = updateLogs.some(
            (log: any) => log.type === "creation"
          );

          const hasNameUpdates =
            user.firstName !== undefined || user.lastName !== undefined;
          const needsMetadataUpdate = !hasCreationLog;

          if (hasNameUpdates || needsMetadataUpdate) {
            if (!hasCreationLog) {
              updateLogs.push({
                type: "creation",
                updatedAt: new Date().toISOString(),
                updatedBy: userId,
              });
            }

            profilesToUpdate.push({
              userId,
              email: user.email,
              firstName:
                user.firstName !== undefined
                  ? user.firstName && user.firstName.trim()
                    ? user.firstName.trim()
                    : null
                  : existingProfile.firstName,
              lastName:
                user.lastName !== undefined
                  ? user.lastName && user.lastName.trim()
                    ? user.lastName.trim()
                    : null
                  : existingProfile.lastName,
              metadata: {
                ...currentMetadata,
                updateLogs,
              },
            });
          }
        }
      }

      // Batch insert profiles using single insert with multiple values
      if (profilesToCreate.length > 0) {
        console.log(
          `[BULK USER CREATE] Batch inserting ${profilesToCreate.length} profiles...`
        );
        try {
          // Use single insert with multiple values for better performance
          await db.insert(userProfile).values(profilesToCreate);
          console.log(
            `[BULK USER CREATE] Successfully batch inserted ${profilesToCreate.length} profiles`
          );
        } catch (error: any) {
          console.error(
            `[BULK USER CREATE] Error in batch insert, falling back to individual inserts:`,
            error.message
          );
          // Fallback to individual inserts for profiles that failed
          for (const profile of profilesToCreate) {
            try {
              await db.insert(userProfile).values(profile);
            } catch (err: any) {
              if (err.code !== "23505") {
                // Ignore unique constraint violations (trigger created it)
                console.error(
                  `[BULK USER CREATE] Failed to insert profile for ${profile.email}:`,
                  err.message
                );
              }
            }
          }
        }
      }

      // Batch update profiles (must be done individually as Drizzle doesn't support bulk updates)
      if (profilesToUpdate.length > 0) {
        console.log(
          `[BULK USER CREATE] Updating ${profilesToUpdate.length} profiles...`
        );
        // Process updates in parallel batches for better performance
        const batchSize = 50;
        for (let i = 0; i < profilesToUpdate.length; i += batchSize) {
          const batch = profilesToUpdate.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (profile) => {
              try {
                await db
                  .update(userProfile)
                  .set({
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    metadata: profile.metadata,
                  })
                  .where(eq(userProfile.id, profile.userId));
              } catch (err: any) {
                console.error(
                  `[BULK USER CREATE] Failed to update profile for ${profile.email}:`,
                  err.message
                );
              }
            })
          );
        }
        console.log(
          `[BULK USER CREATE] Successfully updated ${profilesToUpdate.length} profiles`
        );
      }

      // Step 4: Batch check and assign roles
      const allUserIds = createdUsers.map((cu) => cu.userId);
      const staffRoleUserIds = new Set(allUserIds);
      const teacherRoleUserIds = new Set(
        createdUsers
          .filter((cu) => cu.user.apTeacher && teacherRole.length > 0)
          .map((cu) => cu.userId)
      );

      // Batch check existing roles
      if (allUserIds.length > 0) {
        console.log(`[BULK USER CREATE] Batch checking existing roles...`);
        const usersWithStaffRole = await batchCheckRoles(
          allUserIds,
          staffRole[0].id,
          data.schoolId
        );
        const usersWithTeacherRole =
          teacherRoleUserIds.size > 0 && teacherRole.length > 0
            ? await batchCheckRoles(
                Array.from(teacherRoleUserIds),
                teacherRole[0].id,
                data.schoolId
              )
            : new Set<string>();

        // Remove users who already have roles
        usersWithStaffRole.forEach((userId) => staffRoleUserIds.delete(userId));
        usersWithTeacherRole.forEach((userId) =>
          teacherRoleUserIds.delete(userId)
        );

        // Batch assign roles
        if (staffRoleUserIds.size > 0) {
          console.log(
            `[BULK USER CREATE] Batch assigning SCHOOL_STAFF role to ${staffRoleUserIds.size} users...`
          );
          try {
            // Use Promise.all for parallel role assignments
            await Promise.all(
              Array.from(staffRoleUserIds).map((userId) =>
                rolesRepo
                  .assignRole({
                    userId,
                    roleId: staffRole[0].id,
                    schoolId: data.schoolId,
                    roleScope: "school",
                  })
                  .catch((err: any) => {
                    // Individual failures won't stop the batch
                    console.error(
                      `[BULK USER CREATE] Failed to assign role for ${userId}:`,
                      err.message
                    );
                    return null;
                  })
              )
            );
            console.log(
              `[BULK USER CREATE] Successfully batch assigned SCHOOL_STAFF role`
            );
          } catch (error: any) {
            console.error(
              `[BULK USER CREATE] Error in batch role assignment:`,
              error.message
            );
          }
        }

        if (teacherRoleUserIds.size > 0 && teacherRole.length > 0) {
          console.log(
            `[BULK USER CREATE] Batch assigning TEACHER role to ${teacherRoleUserIds.size} users...`
          );
          try {
            // Use Promise.all for parallel role assignments
            await Promise.all(
              Array.from(teacherRoleUserIds).map((userId) =>
                rolesRepo
                  .assignRole({
                    userId,
                    roleId: teacherRole[0].id,
                    schoolId: data.schoolId,
                    roleScope: "school",
                  })
                  .catch((err: any) => {
                    // Individual failures won't stop the batch
                    console.error(
                      `[BULK USER CREATE] Failed to assign role for ${userId}:`,
                      err.message
                    );
                    return null;
                  })
              )
            );
            console.log(
              `[BULK USER CREATE] Successfully batch assigned TEACHER role`
            );
          } catch (error: any) {
            console.error(
              `[BULK USER CREATE] Error in batch role assignment:`,
              error.message
            );
          }
        }
      }

      // Step 5: Batch create positions for users with positions
      const usersWithPositions = createdUsers.filter(
        (cu) => cu.user.position && cu.user.position.trim().length > 0
      );

      if (usersWithPositions.length > 0) {
        console.log(
          `[BULK USER CREATE] Creating positions for ${usersWithPositions.length} users...`
        );
        await batchCreatePositions(
          usersWithPositions.map((cu) => ({
            userId: cu.userId,
            position: cu.user.position!,
          })),
          data.schoolId
        );
      }

      // Add successful results
      for (const { user, userId } of createdUsers) {
        results.push({
          email: user.email,
          status: "created",
          userId,
          message: "User created successfully",
        });
        successCount++;
      }
    }

    // Add failed user results
    for (const { user, error: errorMessage } of failedUsers) {
      results.push({
        email: user.email,
        status: "error",
        error: errorMessage.includes("already exists")
          ? `User with email ${user.email} already exists`
          : errorMessage,
      });
      errorCount++;
    }

    // Process existing users
    console.log(
      `\n[BULK USER CREATE] Updating ${existingUsers.length} existing users...`
    );

    if (existingUsers.length > 0) {
      // Step 1: Batch check existing profiles
      const existingUserIds = existingUsers.map((eu) => eu.userId);
      console.log(
        `[BULK USER CREATE] Batch checking ${existingUserIds.length} existing profiles...`
      );
      const existingProfilesMap = await batchCheckProfiles(existingUserIds);

      // Step 2: Prepare batch updates
      const profilesToUpdate: Array<{
        userId: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        metadata: any;
      }> = [];

      for (const { user, userId } of existingUsers) {
        const existingProfile = existingProfilesMap.get(userId);

        if (existingProfile) {
          const currentMetadata =
            (existingProfile.metadata as UserMetadata | null) ||
            ({} as UserMetadata);
          const updateLogs = Array.isArray(currentMetadata.updateLogs)
            ? currentMetadata.updateLogs
            : [];
          const hasCreationLog = updateLogs.some(
            (log: any) => log.type === "creation"
          );

          const hasNameUpdates =
            user.firstName !== undefined || user.lastName !== undefined;
          const needsMetadataUpdate = !hasCreationLog;

          if (hasNameUpdates || needsMetadataUpdate) {
            if (!hasCreationLog) {
              updateLogs.push({
                type: "creation",
                updatedAt: new Date().toISOString(),
                updatedBy: userId,
              });
            }

            profilesToUpdate.push({
              userId,
              email: user.email,
              firstName:
                user.firstName !== undefined
                  ? user.firstName && user.firstName.trim()
                    ? user.firstName.trim()
                    : null
                  : existingProfile.firstName,
              lastName:
                user.lastName !== undefined
                  ? user.lastName && user.lastName.trim()
                    ? user.lastName.trim()
                    : null
                  : existingProfile.lastName,
              metadata: {
                ...currentMetadata,
                updateLogs,
              },
            });
          }
        } else {
          // Profile doesn't exist - create it
          profilesToUpdate.push({
            userId,
            email: user.email,
            firstName:
              user.firstName && user.firstName.trim()
                ? user.firstName.trim()
                : null,
            lastName:
              user.lastName && user.lastName.trim()
                ? user.lastName.trim()
                : null,
            metadata: {
              updateLogs: [
                {
                  type: "creation",
                  updatedAt: new Date().toISOString(),
                  updatedBy: userId,
                },
              ],
            },
          });
        }
      }

      // Batch update/create profiles
      if (profilesToUpdate.length > 0) {
        console.log(
          `[BULK USER CREATE] Batch updating ${profilesToUpdate.length} profiles...`
        );
        try {
          // Separate updates and inserts
          const profilesToUpdateOnly = profilesToUpdate.filter((p) =>
            existingProfilesMap.has(p.userId)
          );
          const profilesToInsertOnly = profilesToUpdate.filter(
            (p) => !existingProfilesMap.has(p.userId)
          );

          // Batch update existing profiles using Promise.all
          if (profilesToUpdateOnly.length > 0) {
            await Promise.all(
              profilesToUpdateOnly.map((profile) =>
                db
                  .update(userProfile)
                  .set({
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    metadata: profile.metadata,
                  })
                  .where(eq(userProfile.id, profile.userId))
                  .catch((err: any) => {
                    console.error(
                      `[BULK USER CREATE] Failed to update profile for ${profile.email}:`,
                      err.message
                    );
                    return null;
                  })
              )
            );
            console.log(
              `[BULK USER CREATE] Successfully batch updated ${profilesToUpdateOnly.length} profiles`
            );
          }

          // Batch insert missing profiles using single insert with multiple values
          if (profilesToInsertOnly.length > 0) {
            await db.insert(userProfile).values(
              profilesToInsertOnly.map((profile) => ({
                id: profile.userId,
                email: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
                metadata: profile.metadata,
              }))
            );
            console.log(
              `[BULK USER CREATE] Successfully batch inserted ${profilesToInsertOnly.length} profiles`
            );
          }
        } catch (error: any) {
          console.error(
            `[BULK USER CREATE] Error in batch profile operations, falling back to individual:`,
            error.message
          );
          // Fallback to individual operations
          for (const profile of profilesToUpdate) {
            try {
              if (existingProfilesMap.has(profile.userId)) {
                await db
                  .update(userProfile)
                  .set({
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    metadata: profile.metadata,
                  })
                  .where(eq(userProfile.id, profile.userId));
              } else {
                await db.insert(userProfile).values({
                  id: profile.userId,
                  email: profile.email,
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                  metadata: profile.metadata,
                });
              }
            } catch (err: any) {
              if (err.code !== "23505") {
                // Ignore unique constraint violations
                console.error(
                  `[BULK USER CREATE] Failed to update profile for ${profile.email}:`,
                  err.message
                );
              }
            }
          }
        }
      }

      // Step 2b: Remove TEACHER role for this school where import has apTeacher false (upsert: sync roles to import)
      if (teacherRole.length > 0) {
        const userIdsToRemoveTeacher = existingUsers
          .filter((eu) => !eu.user.apTeacher)
          .map((eu) => eu.userId);
        if (userIdsToRemoveTeacher.length > 0) {
          console.log(
            `[BULK USER CREATE] Removing TEACHER role for ${userIdsToRemoveTeacher.length} existing users (apTeacher not set in import)...`
          );
          await Promise.all(
            userIdsToRemoveTeacher.map((uid) =>
              rolesRepo
                .removeRole(uid, teacherRole[0].id, data.schoolId)
                .catch((err: any) => {
                  console.error(
                    `[BULK USER CREATE] Failed to remove TEACHER for ${uid}:`,
                    err.message
                  );
                  return null;
                })
            )
          );
        }
      }

      // Step 3: Batch check and assign roles
      const staffRoleUserIds = new Set(existingUserIds);
      const teacherRoleUserIds = new Set(
        existingUsers
          .filter((eu) => eu.user.apTeacher && teacherRole.length > 0)
          .map((eu) => eu.userId)
      );

      // Batch check existing roles
      console.log(
        `[BULK USER CREATE] Batch checking existing roles for ${existingUserIds.length} users...`
      );
      const usersWithStaffRole = await batchCheckRoles(
        existingUserIds,
        staffRole[0].id,
        data.schoolId
      );
      const usersWithTeacherRole =
        teacherRoleUserIds.size > 0 && teacherRole.length > 0
          ? await batchCheckRoles(
              Array.from(teacherRoleUserIds),
              teacherRole[0].id,
              data.schoolId
            )
          : new Set<string>();

      // Remove users who already have roles
      usersWithStaffRole.forEach((userId) => staffRoleUserIds.delete(userId));
      usersWithTeacherRole.forEach((userId) =>
        teacherRoleUserIds.delete(userId)
      );

      // Batch assign roles using Promise.all
      if (staffRoleUserIds.size > 0) {
        console.log(
          `[BULK USER CREATE] Batch assigning SCHOOL_STAFF role to ${staffRoleUserIds.size} users...`
        );
        try {
          await Promise.all(
            Array.from(staffRoleUserIds).map((userId) =>
              rolesRepo
                .assignRole({
                  userId,
                  roleId: staffRole[0].id,
                  schoolId: data.schoolId,
                  roleScope: "school",
                })
                .catch((err: any) => {
                  console.error(
                    `[BULK USER CREATE] Failed to assign role for ${userId}:`,
                    err.message
                  );
                  return null;
                })
            )
          );
          console.log(
            `[BULK USER CREATE] Successfully batch assigned SCHOOL_STAFF role`
          );
        } catch (error: any) {
          console.error(
            `[BULK USER CREATE] Error in batch role assignment:`,
            error.message
          );
        }
      }

      if (teacherRoleUserIds.size > 0 && teacherRole.length > 0) {
        console.log(
          `[BULK USER CREATE] Batch assigning TEACHER role to ${teacherRoleUserIds.size} users...`
        );
        try {
          await Promise.all(
            Array.from(teacherRoleUserIds).map((userId) =>
              rolesRepo
                .assignRole({
                  userId,
                  roleId: teacherRole[0].id,
                  schoolId: data.schoolId,
                  roleScope: "school",
                })
                .catch((err: any) => {
                  console.error(
                    `[BULK USER CREATE] Failed to assign role for ${userId}:`,
                    err.message
                  );
                  return null;
                })
            )
          );
          console.log(
            `[BULK USER CREATE] Successfully batch assigned TEACHER role`
          );
        } catch (error: any) {
          console.error(
            `[BULK USER CREATE] Error in batch role assignment:`,
            error.message
          );
        }
      }

      // Step 4: Replace positions for this school (upsert: delete existing, then insert from import)
      console.log(
        `[BULK USER CREATE] Replacing positions for ${existingUserIds.length} existing users at this school...`
      );
      await db
        .delete(userSchoolPositions)
        .where(
          and(
            inArray(userSchoolPositions.userId, existingUserIds),
            eq(userSchoolPositions.schoolId, data.schoolId)
          )
        );

      // Batch create positions from import (now that old positions are removed)
      const existingUsersWithPositions = existingUsers.filter(
        (eu) => eu.user.position && eu.user.position.trim().length > 0
      );

      if (existingUsersWithPositions.length > 0) {
        console.log(
          `[BULK USER CREATE] Creating positions for ${existingUsersWithPositions.length} existing users...`
        );
        await batchCreatePositions(
          existingUsersWithPositions.map((eu) => ({
            userId: eu.userId,
            position: eu.user.position!,
          })),
          data.schoolId
        );
      }

      // Add successful results
      for (const { user, userId } of existingUsers) {
        results.push({
          email: user.email,
          status: "updated",
          userId,
          message: "User updated successfully",
        });
        successCount++;
      }
    }

    // Add duplicate errors
    duplicateEmails.forEach((email) => {
      results.push({
        email,
        status: "error",
        error: "Duplicate email in upload",
      });
      errorCount++;
    });

    const duration = Date.now() - startTime;
    console.log("\n=== BULK USER CREATION SUMMARY ===");
    console.log(`Total users: ${data.users.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Duration: ${duration}ms`);
    console.log("================================\n");
    console.log(`[BULK USER CREATE] ====== COMPLETE (${duration}ms) ======`);

    return NextResponse.json(
      {
        school: {
          id: schoolResult.id,
          name: schoolResult.name,
        },
        total: data.users.length,
        success: successCount,
        errors: errorCount,
        results,
      },
      { status: 200 }
    );
  } catch (e: any) {
    const duration = Date.now() - startTime;
    console.error("[BULK USER CREATE] ====== FATAL ERROR ======");
    console.error("[BULK USER CREATE] Error details:", {
      error: e,
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
      duration: `${duration}ms`,
    });

    // Handle Zod validation errors
    if (e.name === "ZodError") {
      console.error("[BULK USER CREATE] Zod validation error:", (e as z.ZodError).issues);
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: (e as z.ZodError).issues,
        },
        { status: 400 }
      );
    }

    // Handle business logic errors (authorization)
    if (
      e.message?.includes("Unauthorized") ||
      e.message?.includes("Unauthorized")
    ) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }

    if (e.message?.includes("not found") || e.message?.includes("required")) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    // Handle database errors
    const dbError = handleDatabaseError(e, e.message ?? "Internal error");
    console.error(
      `[BULK USER CREATE] Returning error response (${dbError.status}):`,
      {
        error: dbError.error,
      }
    );

    return NextResponse.json(
      { error: dbError.error },
      { status: dbError.status }
    );
  }
}
