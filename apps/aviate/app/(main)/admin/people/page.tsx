import type { Metadata } from "next";

import { AdminPeopleClient } from "./admin-people-client";

export const metadata: Metadata = { title: "Employees · Admin" };

export default function AdminPeoplePage() {
  return <AdminPeopleClient />;
}
