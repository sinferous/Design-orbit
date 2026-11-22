'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getLoggedInUser, setLoggedInUser } from '@/lib/services/work-entry';
import { syncStoredProfileWithSession } from '@/lib/services/auth';

/**
 * Once per page load: if this browser remembers a different profile than the one the
 * signed-in login belongs to, update it and reload so every widget uses the right one.
 */
export function SessionSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') return;
    let cancelled = false;
    syncStoredProfileWithSession(getLoggedInUser(), setLoggedInUser)
      .then(changed => {
        if (!changed || cancelled) return;
        // reload once at most, so blocked storage can never cause a reload loop
        try {
          if (sessionStorage.getItem('design_orbit_profile_synced')) return;
          sessionStorage.setItem('design_orbit_profile_synced', '1');
        } catch {
          return;
        }
        window.location.reload();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // run once per page load, not on every navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
