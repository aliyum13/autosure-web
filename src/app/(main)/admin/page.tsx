import { verifyAdminSession } from '@/lib/dal';
import AdminPanel from './AdminPanel';

export default async function AdminPage() {
  await verifyAdminSession(); // redirects to /login or / if not an admin
  return <AdminPanel />;
}
