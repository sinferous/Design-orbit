'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { WorkEntryWithDetails } from '@/types';
import { WeeklyUserSummary } from '@/lib/services/reports';
import { calculateWorkEntrySeconds } from '@/lib/services/work-entry';
import { workweekFor } from '@/lib/workweek';

/** How long one message stays before a new one is picked: random between these. */
const MIN_HOLD_MS = 2 * 60 * 60 * 1000;
const MAX_HOLD_MS = 4 * 60 * 60 * 1000;

interface Facts {
  name: string;
  hour: number;
  weekday: number; // 0 Sunday .. 6 Saturday
  isWeekend: boolean;
  isFirstWorkday: boolean;
  isLastWorkday: boolean;
  firstWorkdayName: string; // Monday, or Sunday for the Bahrain team
  lastWorkdayName: string; // Friday, or Thursday for the Bahrain team
  pending: number;
  oldestPendingDays: number;
  madeToday: number;
  timerClient: string | null;
  timerMinutes: number;
  weekMade: number;
  weekApproved: number;
  weekRate: number;
  peakDay: { label: string; count: number } | null;
  clientCount: number;
  busiestClient: string | null;
}

interface Line {
  id: string;
  /** Picked more often when true */
  important?: boolean;
  when: (f: Facts) => boolean;
  text: (f: Facts) => string;
  action?: { label: string; href: string };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function timeLabel(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const PENDING = { label: 'Review pending', href: '/work?view=pending' };

const LINES: Line[] = [
  {
    id: 'pending-nudge',
    important: true,
    when: f => f.pending > 0,
    text: f => `You have ${plural(f.pending, 'deliverable', 'deliverables')} waiting on client sign-off. Worth a nudge?`,
    action: PENDING,
  },
  {
    id: 'pending-oldest',
    important: true,
    when: f => f.pending > 0 && f.oldestPendingDays >= 2,
    text: f =>
      `${plural(f.pending, 'piece is', 'pieces are')} still waiting for approval. The oldest has been sitting ${f.oldestPendingDays} days.`,
    action: PENDING,
  },
  {
    id: 'pending-clear',
    when: f => f.pending === 0,
    text: () => 'Nothing waiting on approval. Clean slate.',
  },
  {
    id: 'nothing-today',
    when: f => f.madeToday === 0 && !f.timerClient && f.hour < 17 && !f.isWeekend,
    text: () => 'Nothing logged yet today. What’s first on the board?',
    action: { label: 'Log work', href: '/work/new' },
  },
  {
    id: 'made-today',
    when: f => f.madeToday > 0 && f.hour < 17,
    text: f => `${plural(f.madeToday, 'deliverable', 'deliverables')} logged today. Good pace.`,
  },
  {
    id: 'timer',
    when: f => Boolean(f.timerClient) && f.timerMinutes >= 1,
    text: f => `Your timer has been running on ${f.timerClient} for ${timeLabel(f.timerMinutes)}. Still in the zone?`,
  },
  {
    id: 'week-rate',
    when: f => f.weekMade > 0,
    text: f => `${f.weekMade} made this week and ${f.weekApproved} approved. That’s a ${f.weekRate}% approval rate.`,
  },
  {
    id: 'peak-day',
    when: f => Boolean(f.peakDay && f.peakDay.count > 1),
    text: f => `${f.peakDay!.label} was your big day this week: ${plural(f.peakDay!.count, 'deliverable', 'deliverables')}.`,
  },
  {
    id: 'clients',
    when: f => f.clientCount > 1 && Boolean(f.busiestClient),
    text: f => `You’ve worked with ${f.clientCount} clients this week. Busiest: ${f.busiestClient}.`,
  },
  {
    id: 'evening',
    when: f => f.hour >= 17 && f.madeToday > 0,
    text: f => `${plural(f.madeToday, 'deliverable', 'deliverables')} today. Time to call it a day?`,
  },
  {
    id: 'monday',
    when: f => f.isFirstWorkday && f.weekMade === 0,
    text: f => `${f.firstWorkdayName} again. New week, clean board.`,
    action: { label: 'Log work', href: '/work/new' },
  },
  {
    id: 'friday',
    when: f => f.isLastWorkday && f.pending > 0,
    text: f => `${f.lastWorkdayName}. ${plural(f.pending, 'pending approval stands', 'pending approvals stand')} between you and the weekend.`,
    action: PENDING,
  },

  // A bit of sass
  {
    id: 'sass-pending-many',
    important: true,
    when: f => f.pending >= 5,
    text: f => `${f.pending} pieces waiting on sign-off. The client has seen them. Probably.`,
    action: PENDING,
  },
  {
    id: 'sass-pending-rent',
    important: true,
    when: f => f.pending > 0 && f.oldestPendingDays >= 7,
    text: f => `One piece has waited ${f.oldestPendingDays} days for approval. It’s started paying rent.`,
    action: PENDING,
  },
  {
    id: 'sass-friday-clear',
    when: f => f.isLastWorkday && f.pending === 0,
    text: f => `${f.lastWorkdayName} and nothing pending. Who even are you?`,
  },
  {
    id: 'sass-noon-empty',
    when: f => f.madeToday === 0 && !f.timerClient && f.hour >= 12 && f.hour < 18 && !f.isWeekend,
    text: () => 'Past noon and the log is empty. Bold strategy.',
    action: { label: 'Log work', href: '/work/new' },
  },
  {
    id: 'sass-big-day',
    when: f => f.madeToday >= 10,
    text: f => `${f.madeToday} deliverables today. Leave some work for the rest of us.`,
  },
  {
    id: 'sass-long-timer',
    when: f => Boolean(f.timerClient) && f.timerMinutes >= 120,
    text: f => `${timeLabel(f.timerMinutes)} on ${f.timerClient}. Blink. Drink water. Carry on.`,
  },
  {
    id: 'sass-perfect-rate',
    when: f => f.weekMade >= 5 && f.weekRate === 100,
    text: () => 'Every single thing approved this week. Don’t let it go to your head.',
  },
  {
    id: 'sass-slow-rate',
    when: f => f.weekMade >= 5 && f.weekRate < 50,
    text: f => `${f.weekRate}% approved so far. Clients are slow, not judging. Mostly.`,
    action: PENDING,
  },
  {
    id: 'sass-peak',
    when: f => Boolean(f.peakDay && f.peakDay.count >= 8),
    text: f => `${f.peakDay!.count} on ${f.peakDay!.label}. Was that you, or three of you?`,
  },
  {
    id: 'sass-client-tattoo',
    when: f => f.clientCount > 1 && Boolean(f.busiestClient),
    text: f => `${f.busiestClient} again? You two should get matching tattoos.`,
  },
  {
    id: 'sass-monday-coffee',
    when: f => f.isFirstWorkday && f.hour < 12,
    text: f => `${f.firstWorkdayName} morning. Coffee first, revisions second.`,
  },
  {
    id: 'sass-late',
    when: f => f.hour >= 20,
    text: () => 'Still here this late? The pixels will wait till tomorrow.',
  },
  {
    id: 'sass-weekend',
    when: f => f.isWeekend,
    text: f => `It’s the weekend, ${f.name}. Why are you here?`,
  },
  {
    id: 'sass-filenames',
    when: () => true,
    text: () => 'Reminder: final_final_v3 is not a file naming system.',
  },
  {
    id: 'sass-trophies',
    when: () => true,
    text: () => 'Every logged deliverable is a tiny trophy. Go collect some.',
  },
  {
    id: 'sass-one-more',
    when: f => f.madeToday > 0 && f.hour >= 15 && f.hour < 18,
    text: f => `${plural(f.madeToday, 'deliverable', 'deliverables')} down. One more before chai?`,
  },
];

// Orbit drawing: rings and planets (radius, size, speed, start angle)
const ORBITS = [{ r: 40 }, { r: 66, dashed: true }, { r: 92 }, { r: 114, dashed: true }];
const GREEN = '#55cb98';
const DIM = 'rgba(255,255,255,0.35)';
const PLANETS = [
  { r: 40, size: 3, secs: 24, start: 30, color: GREEN },
  { r: 40, size: 2, secs: 24, start: 210, color: DIM },
  { r: 66, size: 4, secs: 45, start: 120, color: GREEN, reverse: true },
  { r: 66, size: 2.5, secs: 45, start: 300, color: DIM, reverse: true },
  { r: 92, size: 3.5, secs: 70, start: 0, color: DIM },
  { r: 92, size: 5, secs: 70, start: 160, color: GREEN },
  { r: 92, size: 2, secs: 70, start: 255, color: DIM },
  { r: 114, size: 3, secs: 110, start: 80, color: GREEN, reverse: true },
  { r: 114, size: 2.5, secs: 110, start: 200, color: DIM, reverse: true },
  { r: 114, size: 2, secs: 110, start: 330, color: DIM, reverse: true },
];

function greetingFor(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function pickLine(options: Line[], avoidId?: string): Line {
  const pool = options.length > 1 ? options.filter(l => l.id !== avoidId) : options;
  const weighted = pool.flatMap(l => (l.important ? [l, l, l] : [l]));
  return weighted[Math.floor(Math.random() * weighted.length)];
}

interface Stored {
  id: string;
  until: number;
}

function readStored(key: string): Stored | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: Stored) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

interface Props {
  name: string;
  email?: string;
  profileId?: string;
  ready: boolean;
  nowMs: number;
  pendingEntries: WorkEntryWithDetails[];
  myTodayEntries: WorkEntryWithDetails[];
  myWeek?: WeeklyUserSummary;
  festiveNote?: React.ReactNode;
  titleAccessory?: React.ReactNode;
}

export function GreetingTile({
  name,
  email,
  profileId,
  ready,
  nowMs,
  pendingEntries,
  myTodayEntries,
  myWeek,
  festiveNote,
  titleAccessory,
}: Props) {
  const firstName = name.split(' ')[0];
  const workweek = workweekFor(email);
  const now = new Date(nowMs);
  const hour = now.getHours();

  const facts: Facts = useMemo(() => {
    const pending = pendingEntries.reduce(
      (acc, e) => acc + Math.max(0, (e.quantity_done || 0) - (e.quantity_approved || 0)),
      0
    );
    const oldestDate = pendingEntries.reduce<string | null>(
      (min, e) => (!min || e.work_date < min ? e.work_date : min),
      null
    );
    const oldestPendingDays = oldestDate
      ? Math.floor((Date.now() - new Date(`${oldestDate}T00:00:00`).getTime()) / 86_400_000)
      : 0;

    const running = myTodayEntries.find(e => e.timer_started_at);
    const timerMinutes = running ? Math.floor(calculateWorkEntrySeconds(running, nowMs) / 60) : 0;

    const weekEntries = myWeek?.entries ?? [];
    const byDay = new Map<string, number>();
    const byClient = new Map<string, number>();
    for (const e of weekEntries) {
      byDay.set(e.work_date, (byDay.get(e.work_date) || 0) + (e.quantity_done || 0));
      const c = e.client?.name;
      if (c) byClient.set(c, (byClient.get(c) || 0) + (e.quantity_done || 0));
    }
    let peakDay: Facts['peakDay'] = null;
    if (byDay.size >= 2) {
      const [date, count] = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
      peakDay = {
        label: new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' }),
        count,
      };
    }
    const busiest = [...byClient.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      name: firstName,
      hour,
      weekday: now.getDay(),
      isWeekend: workweek.weekend.includes(now.getDay()),
      isFirstWorkday: now.getDay() === workweek.firstWorkday,
      isLastWorkday: now.getDay() === workweek.lastWorkday,
      firstWorkdayName: workweek.firstWorkdayName,
      lastWorkdayName: workweek.lastWorkdayName,
      pending,
      oldestPendingDays,
      madeToday: myTodayEntries.reduce((acc, e) => acc + (e.quantity_done || 0), 0),
      timerClient: running ? running.client?.name || 'a task' : null,
      timerMinutes,
      weekMade: myWeek?.totalCreated ?? 0,
      weekApproved: myWeek?.totalApproved ?? 0,
      weekRate: Math.round(myWeek?.approvalRate ?? 0),
      peakDay,
      clientCount: byClient.size,
      busiestClient: busiest ? busiest[0] : null,
    };
    // nowMs changes every second while a timer runs; minutes are enough here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEntries, myTodayEntries, myWeek, firstName, email, hour, Math.floor(nowMs / 60_000)]);

  const [lineId, setLineId] = useState<string | null>(null);
  const storeKey = `design_orbit_greeting_${profileId || firstName.toLowerCase()}`;

  // Keep one message for 2 to 4 hours. Pick a new one when that time is up
  // or when the kept message no longer fits the numbers.
  useEffect(() => {
    if (!ready) return;
    const options = LINES.filter(l => l.when(facts));
    if (options.length === 0) return;

    const stored = readStored(storeKey);
    const stillValid = stored && stored.until > Date.now() && options.some(l => l.id === stored.id);
    if (stillValid) {
      setLineId(stored!.id);
      return;
    }
    const next = pickLine(options, stored?.id);
    const hold = MIN_HOLD_MS + Math.random() * (MAX_HOLD_MS - MIN_HOLD_MS);
    writeStored(storeKey, { id: next.id, until: Date.now() + hold });
    setLineId(next.id);
  }, [ready, facts, storeKey]);

  // If the page stays open past the hold time, swap the message then
  useEffect(() => {
    const stored = readStored(storeKey);
    if (!stored) return;
    const wait = stored.until - Date.now();
    if (wait <= 0) return;
    const t = window.setTimeout(() => {
      const options = LINES.filter(l => l.when(facts));
      if (options.length === 0) return;
      const next = pickLine(options, stored.id);
      const hold = MIN_HOLD_MS + Math.random() * (MAX_HOLD_MS - MIN_HOLD_MS);
      writeStored(storeKey, { id: next.id, until: Date.now() + hold });
      setLineId(next.id);
    }, Math.min(wait, 2_147_000_000));
    return () => window.clearTimeout(t);
  }, [lineId, storeKey, facts]);

  const line = LINES.find(l => l.id === lineId);

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <section className="bento-card relative overflow-hidden px-5 py-6 sm:px-8 sm:py-7">
      {/* Orbit drawing, the brand motif: two rings, a slow planet */}
      <svg
        viewBox="0 0 240 240"
        className="pointer-events-none absolute -right-20 top-1/2 -translate-y-1/2 w-[340px] h-[340px] hidden md:block"
        aria-hidden
      >
        {ORBITS.map(o => (
          <circle
            key={o.r}
            cx="120"
            cy="120"
            r={o.r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray={o.dashed ? '2 5' : undefined}
          />
        ))}
        <circle cx="120" cy="120" r="16" fill="rgba(85,203,152,0.14)" />
        <circle cx="120" cy="120" r="6.5" fill="#55cb98" opacity="0.85" />
        {PLANETS.map((p, i) => (
          <g key={i} transform={`rotate(${p.start} 120 120)`}>
            <g
              style={{
                transformOrigin: '120px 120px',
                animation: reduceMotion ? undefined : `spin ${p.secs}s linear infinite${p.reverse ? ' reverse' : ''}`,
              }}
            >
              <circle cx={120 + p.r} cy="120" r={p.size} fill={p.color} />
            </g>
          </g>
        ))}
      </svg>

      <div className="relative max-w-2xl md:pr-40 space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {festiveNote}
          </p>
          {/* Greeting and message read as one headline */}
          <h1 className="font-display text-2xl sm:text-[30px] leading-[1.25] font-medium text-balance">
            <span className="block text-slate-50">
              {greetingFor(hour)}, {firstName}.
              {titleAccessory && <span className="inline-block align-middle ml-2">{titleAccessory}</span>}
            </span>
            {line ? (
              <span className="block mt-1 text-slate-400">{line.text(facts)}</span>
            ) : (
              <span className="block mt-2 h-6 w-64 max-w-full rounded bg-white/[0.04]" />
            )}
          </h1>
        </div>

        {line?.action && (
          <Link
            href={line.action.href}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-500 text-sm font-medium text-[#0b1410] hover:bg-emerald-400 transition-colors"
          >
            {line.action.label}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </section>
  );
}
