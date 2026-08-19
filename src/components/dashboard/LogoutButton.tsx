'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" className="border-ch-border" onClick={logout}>
      Log out
    </Button>
  );
}
