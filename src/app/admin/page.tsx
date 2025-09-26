import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminPanel from '@/components/AdminPanel';
import { isUserAdmin } from '@/lib/auth/is-admin';

export default async function AdminPage() {
  const user = await currentUser();

  // Check if user is authenticated and is admin
  if (!user) {
    redirect('/');
  }

  // Check for admin status using centralized function
  if (!isUserAdmin(user)) {
    redirect('/');
  }

  return <AdminPanel user={user} />;
}