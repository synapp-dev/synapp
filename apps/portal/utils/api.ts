import { getUsers } from "@/business/userService";

export async function fetchUsers() {
  return getUsers();
}
