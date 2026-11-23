'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { GreetingTile } from '@/components/dashboard/GreetingTile';
import {
  fetchWorkEntriesByDate,
  fetchPendingApprovalEntries,
  getLoggedInUser,
  isAdminUser,
} from '@/lib/services/work-entry';
import { getWeeklyReportData, getVelocityWeekRange, WeeklyUserSummary } from '@/lib/services/reports';
import { WorkEntryWithDetails } from '@/types';

/**
 * The dashboard greeting tile for other pages (My log). Loads the same numbers as the
 * dashboard, so both pages show the same message.
 */
export function GreetingStrip({ eyebrow }: { eyebrow?: string }) {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string; profileId?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [today, setToday] = useState<WorkEntryWithDetails[]>([]);
  const [pending, setPending] = useState<WorkEntryWithDetails[]>([]);
  const [week, setWeek] = useState<WeeklyUserSummary[]>([]);

  useEffect(() => {
    const u = getLoggedInUser();
    if (!u || isAdminUser(u)) return;
    setUser(u);

    let cancelled = false;
    (async () => {
      try {
        const range = getVelocityWeekRange(new Date());
        const todayStr = new Date().toISOString().split('T')[0];
        const [t, w, p] = await Promise.all([
          fetchWorkEntriesByDate(todayStr),
          getWeeklyReportData(range.startDate, range.endDate),
          fetchPendingApprovalEntries(u.profileId),
        ]);
        if (cancelled) return;
        setToday(t);
        setWeek(w);
        setPending(p);
      } catch {
        // the strip is a nicety: on failure it shows the greeting with whatever loaded
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const tick = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
  }, []);

  const myToday = useMemo(
    () => today.filter(e => e.user_id === user?.profileId || e.profile?.id === user?.profileId),
    [today, user?.profileId]
  );

  if (!user) return null;

  return (
    <GreetingTile
      currentPath={pathname}
      eyebrow={eyebrow}
      name={user.name}
      email={user.email}
      profileId={user.profileId}
      ready={ready}
      nowMs={nowMs}
      pendingEntries={pending}
      myTodayEntries={myToday}
      myWeek={week.find(w => w.profile?.id === user.profileId)}
    />
  );
}
