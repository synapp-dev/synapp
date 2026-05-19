export type UserLookupResponse = {
  exists: boolean;
  userId?: string;
  firstName?: string | null;
  lastName?: string | null;
  schoolRoleKeys?: string[];
};
