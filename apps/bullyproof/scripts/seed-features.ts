import { db } from '../server/db/drizzle';
import { features, featurePermissions, roles } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function seedFeatures() {
  console.log('🌱 Seeding features...');
  
  try {
    // Define initial features
    const featuresData = [
      // System features
      { key: 'system:maintenance', name: 'Maintenance mode', description: 'When enabled, user is redirected to the maintenance page and sees only the maintenance menu', category: 'system', section: 'system' },
      { key: 'system:admin-access', name: 'Admin Access', description: 'General admin functionality access', category: 'system', section: 'system' },
      { key: 'system:teacher-access', name: 'Teacher Access', description: 'General teacher functionality access', category: 'system', section: 'system' },
      { key: 'system:school-admin-access', name: 'School Admin Access', description: 'School admin functionality access', category: 'system', section: 'system' },
      { key: 'system:impersonate', name: 'Impersonate Users', description: 'Access to the impersonate user menu in the app header', category: 'system', section: 'system' },
      { key: 'system:feedback-button', name: 'Feedback Button', description: 'Access to the feedback/bug report button in the app header', category: 'system', section: 'system' },

      // Page features – top-level
      { key: '/dashboard', name: 'Dashboard', description: 'Access to the dashboard', category: 'page', section: 'dashboard' },
      { key: '/welcome', name: 'Welcome Page', description: 'Access to the welcome page', category: 'page', section: 'welcome' },
      { key: '/support', name: 'Support Page', description: 'Access to the support page', category: 'page', section: 'support' },
      { key: '/settings', name: 'Settings Page', description: 'Access to the settings page', category: 'page', section: 'dashboard' },
      { key: '/ap-certification', name: 'AP Certification', description: 'Access to AP Certification', category: 'page', section: 'certification' },

      // Page features – school-scoped
      { key: '/school/home', name: 'Home Page', description: 'Access to the home page', category: 'page', section: 'schools-home' },
      { key: '/school/lessons', name: 'Lessons Page', description: 'Access to the lessons page', category: 'page', section: 'schools-lessons' },
      { key: '/school/content', name: 'Content Page', description: 'Access to the content page', category: 'page', section: 'schools-content' },
      { key: '/school/resources', name: 'Resources Page', description: 'Access to the resources page', category: 'page', section: 'schools-resources' },
      { key: '/school/teachers', name: 'Teachers Page', description: 'Access to the teachers page', category: 'page', section: 'schools-teachers' },
      { key: '/school/classes', name: 'Classes Page', description: 'Access to the classes page', category: 'page', section: 'schools-classes' },
      { key: '/school/performance', name: 'Performance Page', description: 'Access to the performance page', category: 'page', section: 'schools-performance' },
      { key: '/school/reports', name: 'Reports Page', description: 'Access to the reports page', category: 'page', section: 'schools-reports' },

      // Page features – admin
      { key: '/admin', name: 'Admin Panel', description: 'Access to the admin panel', category: 'page', section: 'admin' },
      { key: '/admin/content', name: 'Admin: Content', description: 'Access to admin content section', category: 'page', section: 'admin' },
      { key: '/admin/schools', name: 'Admin: Schools', description: 'Access to admin schools section', category: 'page', section: 'admin' },
      { key: '/admin/users', name: 'Admin: Users', description: 'Access to admin users section', category: 'page', section: 'admin' },
      { key: '/admin/features', name: 'Admin: Features', description: 'Access to admin features section', category: 'page', section: 'admin' },
      { key: '/admin/classes', name: 'Admin: Classes', description: 'Access to admin classes section', category: 'page', section: 'admin' },
      { key: '/admin/lessons', name: 'Admin: Lessons', description: 'Access to admin lessons section', category: 'page', section: 'admin' },
      { key: '/admin/culture-ratings', name: 'Admin: Culture Ratings', description: 'Access to admin culture ratings section', category: 'page', section: 'admin' },
      { key: '/admin/audit-logs', name: 'Admin: Audit Logs', description: 'Access to admin audit logs section', category: 'page', section: 'admin' },
      { key: '/admin/support-tools', name: 'Admin: Support Tools', description: 'Access to admin support tools section', category: 'page', section: 'admin' },
    ];
    
    // Insert features
    console.log('📝 Inserting features...');
    const insertedFeatures = [];
    for (const feature of featuresData) {
      const result = await db
        .insert(features)
        .values(feature)
        .onConflictDoNothing()
        .returning();
      
      if (result.length > 0) {
        insertedFeatures.push(result[0]);
        console.log(`  ✅ Created feature: ${feature.key}`);
      } else {
        // Feature already exists, fetch it
        const existing = await db
          .select()
          .from(features)
          .where(eq(features.key, feature.key))
          .limit(1);
        if (existing.length > 0) {
          insertedFeatures.push(existing[0]);
          console.log(`  ⏭️  Feature already exists: ${feature.key}`);
        }
      }
    }
    
    console.log(`✅ Processed ${insertedFeatures.length} features`);
    
    // Get role IDs for role-based permissions
    console.log('🔐 Setting up role-based permissions...');
    const platformAdminRole = await db
      .select()
      .from(roles)
      .where(eq(roles.key, 'PLATFORM_ADMIN'))
      .limit(1);
    
    const teacherRole = await db
      .select()
      .from(roles)
      .where(eq(roles.key, 'TEACHER'))
      .limit(1);
    
    const schoolAdminRole = await db
      .select()
      .from(roles)
      .where(eq(roles.key, 'SCHOOL_ADMIN'))
      .limit(1);
    
    const intradarkDevRole = await db
      .select()
      .from(roles)
      .where(eq(roles.key, 'INTRADARK_DEV'))
      .limit(1);
    
    const platformModeratorRole = await db
      .select()
      .from(roles)
      .where(eq(roles.key, 'PLATFORM_MODERATOR'))
      .limit(1);
    
    const platformStaffRole = await db
      .select()
      .from(roles)
      .where(eq(roles.key, 'PLATFORM_STAFF'))
      .limit(1);
    
    // Enable features for roles globally to maintain backward compatibility
    const permissionsToCreate = [];
    
    // Platform Admin gets admin-access, admin feature, and all admin page features
    if (platformAdminRole.length > 0) {
      const adminAccessFeature = insertedFeatures.find(f => f.key === 'system:admin-access');
      const adminFeature = insertedFeatures.find(f => f.key === '/admin');
      const adminSectionFeatures = insertedFeatures.filter(f => f.key.startsWith('/admin/'));

      if (adminAccessFeature) {
        permissionsToCreate.push({
          featureId: adminAccessFeature.id,
          level: 'role' as const,
          targetId: platformAdminRole[0].id,
          enabled: true,
        });
      }

      if (adminFeature) {
        permissionsToCreate.push({
          featureId: adminFeature.id,
          level: 'role' as const,
          targetId: platformAdminRole[0].id,
          enabled: true,
        });
      }

      for (const feature of adminSectionFeatures) {
        permissionsToCreate.push({
          featureId: feature.id,
          level: 'role' as const,
          targetId: platformAdminRole[0].id,
          enabled: true,
        });
      }
    }
    
    // Teacher gets teacher-access and lessons feature
    if (teacherRole.length > 0) {
      const teacherAccessFeature = insertedFeatures.find(f => f.key === 'system:teacher-access');
      const lessonsFeature = insertedFeatures.find(f => f.key === '/school/lessons');
      
      if (teacherAccessFeature) {
        permissionsToCreate.push({
          featureId: teacherAccessFeature.id,
          level: 'role' as const,
          targetId: teacherRole[0].id,
          enabled: true,
        });
      }
      
      if (lessonsFeature) {
        permissionsToCreate.push({
          featureId: lessonsFeature.id,
          level: 'role' as const,
          targetId: teacherRole[0].id,
          enabled: true,
        });
      }
    }
    
    // School Admin gets school-admin-access
    if (schoolAdminRole.length > 0) {
      const schoolAdminAccessFeature = insertedFeatures.find(f => f.key === 'system:school-admin-access');
      
      if (schoolAdminAccessFeature) {
        permissionsToCreate.push({
          featureId: schoolAdminAccessFeature.id,
          level: 'role' as const,
          targetId: schoolAdminRole[0].id,
          enabled: true,
        });
      }
    }
    
    // Impersonate: only INTRADARK_DEV gets access; PLATFORM_ADMIN/MODERATOR/STAFF can see but not use
    const impersonateFeature = insertedFeatures.find(f => f.key === 'system:impersonate');
    if (impersonateFeature) {
      if (intradarkDevRole.length > 0) {
        permissionsToCreate.push({
          featureId: impersonateFeature.id,
          level: 'role' as const,
          targetId: intradarkDevRole[0].id,
          enabled: true,
        });
      }
      const visibleOnlyRoles = [platformAdminRole, platformModeratorRole, platformStaffRole];
      for (const role of visibleOnlyRoles) {
        if (role.length > 0) {
          permissionsToCreate.push({
            featureId: impersonateFeature.id,
            level: 'role' as const,
            targetId: role[0].id,
            enabled: false,
            visible: true,
          });
        }
      }
    }
    
    // Feedback button: enabled for INTRADARK_DEV and PLATFORM_ADMIN
    const feedbackFeature = insertedFeatures.find(f => f.key === 'system:feedback-button');
    if (feedbackFeature) {
      if (intradarkDevRole.length > 0) {
        permissionsToCreate.push({
          featureId: feedbackFeature.id,
          level: 'role' as const,
          targetId: intradarkDevRole[0].id,
          enabled: true,
        });
      }
      if (platformAdminRole.length > 0) {
        permissionsToCreate.push({
          featureId: feedbackFeature.id,
          level: 'role' as const,
          targetId: platformAdminRole[0].id,
          enabled: true,
        });
      }
    }
    
    // Insert permissions
    let permissionsCreated = 0;
    for (const permission of permissionsToCreate) {
      const result = await db
        .insert(featurePermissions)
        .values(permission)
        .onConflictDoNothing()
        .returning();
      
      if (result.length > 0) {
        permissionsCreated++;
        console.log(`  ✅ Created permission for role`);
      }
    }
    
    console.log(`✅ Created ${permissionsCreated} role-based permissions`);
    
    // Enable all navigation and admin_section features globally by default (for backward compatibility)
    // This can be overridden at role/school/user level
    console.log('🌍 Setting up global permissions (all enabled by default for backward compatibility)...');
    const pageFeatures = insertedFeatures.filter(f => f.category === 'page');
    const featuresForGlobal = [...pageFeatures];

    let globalPermissionsCreated = 0;
    for (const feature of featuresForGlobal) {
      const result = await db
        .insert(featurePermissions)
        .values({
          featureId: feature.id,
          level: 'global',
          targetId: null,
          enabled: true,
        })
        .onConflictDoNothing()
        .returning();
      
      if (result.length > 0) {
        globalPermissionsCreated++;
      }
    }
    
    // Impersonate: globally hidden (not visible, not enabled)
    if (impersonateFeature) {
      const result = await db
        .insert(featurePermissions)
        .values({
          featureId: impersonateFeature.id,
          level: 'global',
          targetId: null,
          enabled: false,
          visible: false,
        })
        .onConflictDoNothing()
        .returning();
      
      if (result.length > 0) {
        globalPermissionsCreated++;
      }
    }
    
    // Feedback button: globally visible but not enabled (users can see it but not interact)
    if (feedbackFeature) {
      const result = await db
        .insert(featurePermissions)
        .values({
          featureId: feedbackFeature.id,
          level: 'global',
          targetId: null,
          enabled: false,
          visible: true,
        })
        .onConflictDoNothing()
        .returning();
      
      if (result.length > 0) {
        globalPermissionsCreated++;
      }
    }
    
    console.log(`✅ Created ${globalPermissionsCreated} global permissions (all features enabled by default)`);
    
    console.log('🎉 Feature seeding completed!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`  - Features: ${insertedFeatures.length}`);
    console.log(`  - Role-based permissions: ${permissionsCreated}`);
    console.log(`  - Global permissions: ${globalPermissionsCreated}`);
    console.log('');
    console.log('💡 Note: All features are enabled globally by default for backward compatibility.');
    console.log('   You can now override permissions at role, school, or user levels as needed.');
    
  } catch (error) {
    console.error('💥 Feature seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedFeatures()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
