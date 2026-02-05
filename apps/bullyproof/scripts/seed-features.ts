import { db } from '../server/db/drizzle';
import { features, featurePermissions, roles } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function seedFeatures() {
  console.log('🌱 Seeding features...');
  
  try {
    // Define initial features
    const featuresData = [
      // System features (maintenance first)
      { key: 'maintenance', name: 'Maintenance mode', description: 'When enabled, user is redirected to the maintenance page and sees only the maintenance menu', category: 'system' },
      // Navigation features
      { key: 'lessons', name: 'Lessons Page', description: 'Access to the lessons page', category: 'navigation' },
      { key: 'content', name: 'Content Page', description: 'Access to the content page', category: 'navigation' },
      { key: 'resources', name: 'Resources Page', description: 'Access to the resources page', category: 'navigation' },
      { key: 'dashboard', name: 'Dashboard', description: 'Access to the dashboard', category: 'navigation' },
      { key: 'admin', name: 'Admin Panel', description: 'Access to the admin panel', category: 'navigation' },
      { key: 'ap_certification', name: 'AP Certification', description: 'Access to AP Certification', category: 'navigation' },
      { key: 'welcome', name: 'Welcome Page', description: 'Access to the welcome page', category: 'navigation' },
      { key: 'support', name: 'Support Page', description: 'Access to the support page', category: 'navigation' },
      { key: 'teachers', name: 'Teachers Page', description: 'Access to the teachers page', category: 'navigation' },
      { key: 'classes', name: 'Classes Page', description: 'Access to the classes page', category: 'navigation' },
      { key: 'performance', name: 'Performance Page', description: 'Access to the performance page', category: 'navigation' },
      { key: 'settings', name: 'Settings Page', description: 'Access to the settings page', category: 'navigation' },
      { key: 'reports', name: 'Reports Page', description: 'Access to the reports page', category: 'navigation' },
      { key: 'home', name: 'Home Page', description: 'Access to the home page', category: 'navigation' },
      
      // Role-based access features
      { key: 'admin_access', name: 'Admin Access', description: 'General admin functionality access', category: 'role' },
      { key: 'teacher_access', name: 'Teacher Access', description: 'General teacher functionality access', category: 'role' },
      { key: 'school_admin_access', name: 'School Admin Access', description: 'School admin functionality access', category: 'role' },

      // Admin section features (granular toggles per admin area)
      { key: 'admin_content', name: 'Admin: Content', description: 'Access to admin content section', category: 'admin_section' },
      { key: 'admin_schools', name: 'Admin: Schools', description: 'Access to admin schools section', category: 'admin_section' },
      { key: 'admin_users', name: 'Admin: Users', description: 'Access to admin users section', category: 'admin_section' },
      { key: 'admin_features', name: 'Admin: Features', description: 'Access to admin features section', category: 'admin_section' },
      { key: 'admin_classes', name: 'Admin: Classes', description: 'Access to admin classes section', category: 'admin_section' },
      { key: 'admin_lessons', name: 'Admin: Lessons', description: 'Access to admin lessons section', category: 'admin_section' },
      { key: 'admin_culture_ratings', name: 'Admin: Culture Ratings', description: 'Access to admin culture ratings section', category: 'admin_section' },
      { key: 'admin_audit_logs', name: 'Admin: Audit Logs', description: 'Access to admin audit logs section', category: 'admin_section' },
      { key: 'admin_support_tools', name: 'Admin: Support Tools', description: 'Access to admin support tools section', category: 'admin_section' },
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
    
    // Enable features for roles globally to maintain backward compatibility
    const permissionsToCreate = [];
    
    // Platform Admin gets admin_access, admin feature, and all admin section features
    if (platformAdminRole.length > 0) {
      const adminAccessFeature = insertedFeatures.find(f => f.key === 'admin_access');
      const adminFeature = insertedFeatures.find(f => f.key === 'admin');
      const adminSectionFeatures = insertedFeatures.filter(f => f.category === 'admin_section');

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
    
    // Teacher gets teacher_access and lessons feature
    if (teacherRole.length > 0) {
      const teacherAccessFeature = insertedFeatures.find(f => f.key === 'teacher_access');
      const lessonsFeature = insertedFeatures.find(f => f.key === 'lessons');
      
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
    
    // School Admin gets school_admin_access
    if (schoolAdminRole.length > 0) {
      const schoolAdminAccessFeature = insertedFeatures.find(f => f.key === 'school_admin_access');
      
      if (schoolAdminAccessFeature) {
        permissionsToCreate.push({
          featureId: schoolAdminAccessFeature.id,
          level: 'role' as const,
          targetId: schoolAdminRole[0].id,
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
    const navigationFeatures = insertedFeatures.filter(f => f.category === 'navigation');
    const adminSectionFeatures = insertedFeatures.filter(f => f.category === 'admin_section');
    const featuresForGlobal = [...navigationFeatures, ...adminSectionFeatures];

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
