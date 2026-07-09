import {
  getCurrentUser,
  listUsers,
  UsersColumns,
  AdminUserNav,
} from "@/features/users";
import AdminShell from "@/components/admin/AdminShell";
import ErrorToaster from "@/components/layouts/ErrorToaster";
import DataTable from "@/features/cms/components/DataTable";
// TODO: CREATE New Data Table for golbaluse

type AdminUsersPageProps = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

async function UsersPage({ searchParams }: AdminUsersPageProps) {
  const currentUser = await getCurrentUser();

  const users = await listUsers({});

  return (
    <AdminShell heading="Users" description="Edit/Create new user by admin.">
      <AdminUserNav />
      <DataTable columns={UsersColumns} data={users || []} />
      <ErrorToaster />
    </AdminShell>
  );
}

export default UsersPage;
