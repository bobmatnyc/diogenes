import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminPanel from '@/components/AdminPanel';

export default async function AdminPage() {
  const user = await currentUser();

  // Check if user is authenticated and is admin
  if (!user) {
    redirect('/');
  }

  // Check for admin status (using publicMetadata or a specific email/id)
  const isAdmin = user.publicMetadata?.isAdmin === true ||
                  user.emailAddresses?.[0]?.emailAddress === 'bobmatnyc@gmail.com' ||
                  user.id === 'user_2qGtyVyDeeYjKKkkbobj6LfLRHH'; // Your specific user ID

  if (!isAdmin) {
    redirect('/');
  }

  return <AdminPanel user={user} />;
}