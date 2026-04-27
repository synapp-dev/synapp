import { useMemo } from "react";
import { useMeStore } from "@/entities/me/model/store";
import { useSchoolStore } from "@/stores/school-store";

/**
 * Hook to check if the current user is a teacher for the active school
 * and provides filtering logic for navigation items
 */
export function useSchoolNavigationPermissions() {
  const currentUser = useMeStore((s) => s.currentUser);
  const activeSchool = useSchoolStore((s) => s.getActiveSchool());

  const isTeacherForCurrentSchool = useMemo(() => {
    if (!currentUser?.schoolRoles || !activeSchool?.id) return false;
    const schoolRoles = currentUser.schoolRoles as Array<{
      roleKey: string;
      schoolId: string;
    }>;
    return schoolRoles.some(
      (role) => role.roleKey === "TEACHER" && role.schoolId === activeSchool.id,
    );
  }, [currentUser, activeSchool]);

  /**
   * Check if a navigation item should be visible based on teacher role
   * @param itemTitle - The title of the navigation item
   * @returns true if the item should be visible
   */
  const shouldShowItem = useMemo(() => {
    return (itemTitle: string): boolean => {
      if (!isTeacherForCurrentSchool) {
        // Non-teachers see everything
        return true;
      }

      // Teachers only see specific items
      const allowedItems = [
        "Home",
        "Teachers",
        "Classes",
        "Lessons",
        "Content",
        "Resources",
      ];

      return allowedItems.includes(itemTitle);
    };
  }, [isTeacherForCurrentSchool]);

  /**
   * Filter an array of navigation items based on teacher role
   */
  const filterItems = useMemo(() => {
    return <T extends { title: string }>(items: T[]): T[] => {
      if (!isTeacherForCurrentSchool) {
        return items;
      }
      return items.filter((item) => shouldShowItem(item.title));
    };
  }, [isTeacherForCurrentSchool, shouldShowItem]);

  /**
   * Filter navigation categories, removing categories with no visible items
   */
  const filterCategories = useMemo(() => {
    return <
      T extends {
        name: string;
        items: Array<{ title: string }>;
      },
    >(
      categories: T[],
    ): T[] => {
      if (!isTeacherForCurrentSchool) {
        return categories;
      }

      return categories
        .map((category) => ({
          ...category,
          items: filterItems(category.items),
        }))
        .filter((category) => category.items.length > 0);
    };
  }, [isTeacherForCurrentSchool, filterItems]);

  return {
    isTeacherForCurrentSchool,
    shouldShowItem,
    filterItems,
    filterCategories,
  };
}
