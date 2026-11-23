'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getLoggedInUser } from '@/lib/services/work-entry';
import {
  fetchTeamStatuses,
  fetchMemberToday,
  saveMyStatus,
  isStatusSyncedToTeam,
  MemberStatus,
  MemberTodayEntry,
} from '@/lib/services/team-status';
import { cn } from '@/lib/utils';

const PRESETS: { emoji: string; text: string }[] = [
  { emoji: '🎧', text: 'In the zone' },
  { emoji: '☕', text: 'Chai break' },
  { emoji: '🍱', text: 'Lunch' },
  { emoji: '📞', text: 'On a call' },
  { emoji: '🎨', text: 'Pixels' },
  { emoji: '⏳', text: 'Rendering' },
  { emoji: '🧠', text: 'Thinking' },
  { emoji: '🔥', text: 'On fire' },
  { emoji: '🫠', text: 'Revisions' },
  { emoji: '🏖️', text: 'Off today' },
];

const EMOJIS = ['🎧', '☕', '🍱', '🎨', '🔥', '🧠', '🚀', '🫠', '😴', '🤒', '🏖️', '🎉', '🐢', '👀', '🍕', '💡'];

type ClearAfter = '1h' | '4h' | 'today' | 'never';
const CLEAR_LABELS: Record<ClearAfter, string> = { '1h': '1 hour', '4h': '4 hours', today: 'Today', never: 'Keep' };

function expiryFor(choice: ClearAfter): string | null {
  const now = new Date();
  if (choice === '1h') return new Date(now.getTime() + 3600_000).toISOString();
  if (choice === '4h') return new Date(now.getTime() + 4 * 3600_000).toISOString();
  if (choice === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  return null;
}

function formatElapsed(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} m` : `${m} m`;
}

function clearsLabel(expiresAt: string | null, nowMs: number) {
  if (!expiresAt) return null;
  const at = new Date(expiresAt);
  const left = at.getTime() - nowMs;
  if (left <= 0) return null;
  if (left < 3600_000) return `Clears in ${Math.max(1, Math.round(left / 60_000))} min`;
  if (at.toDateString() === new Date(nowMs).toDateString()) {
    return at.getHours() === 23 && at.getMinutes() === 59
      ? 'Clears tonight'
      : `Clears at ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return `Clears ${at.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}`;
}

function Avatar({ m, size = 'sm' }: { m: MemberStatus; size?: 'sm' | 'md' }) {
  return (
  <div className={cn('relative shrink-0', size === 'md' ? 'w-8 h-8' : 'w-7 h-7')}>
    <div
      className={cn(
        'w-full h-full rounded-full flex items-center justify-center font-display text-[11px]',
        m.workingOn ? 'bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/50' : 'bg-white/[0.05] text-slate-400'
      )}
    >
      {m.name.charAt(0).toUpperCase()}
    </div>
    {m.emoji && (
      <span className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-[#0c0c0b] flex items-center justify-center text-[10px] leading-none">
        {m.emoji}
      </span>
    )}
  </div>
  );
}

const HOVER_OPEN_MS = 300;
const HOVER_CLOSE_MS = 150;
const TODAY_SHOWN = 3;

function MemberCard({
  ref,
  m,
  today,
  pos,
  onEnter,
  onLeave,
  onClose,
}: {
  ref: React.Ref<HTMLDivElement>;
  m: MemberStatus;
  today: MemberTodayEntry[] | 'loading' | undefined;
  pos: { left: number; top: number } | null;
  onEnter: () => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  // Ticks the running timer while the card is open
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const hasStatus = Boolean(m.text || m.emoji);
  const clears = hasStatus ? clearsLabel(m.expiresAt, nowMs) : null;
  const elapsed = m.workingStartedAt
    ? m.workingBaseSeconds + Math.max(0, Math.floor((nowMs - new Date(m.workingStartedAt).getTime()) / 1000))
    : null;
  const entries = Array.isArray(today) ? today : [];
  const deliverables = entries.reduce((sum, e) => sum + e.quantity, 0);
  const shown = entries.slice(0, TODAY_SHOWN);
  const more = entries.length - shown.length;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${m.name}'s status`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? 0,
        opacity: pos ? 1 : 0,
        transform: pos ? 'translateX(0)' : 'translateX(-6px)',
      }}
      className="fixed z-[100] w-72 max-w-[calc(100vw-16px)] rounded-xl border border-white/[0.1] bg-[#121211] p-3.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
    >
      <div className="flex items-center gap-2.5">
        <Avatar m={m} size="md" />
        <div className="min-w-0 leading-tight">
          <div className="text-[14px] text-slate-100 truncate">{m.name}</div>
          {m.designation && <div className="text-[11px] text-slate-500 truncate">{m.designation}</div>}
        </div>
      </div>

      {hasStatus && (
        <div className="mt-3 flex gap-2">
          {m.emoji && <span className="text-base leading-5 shrink-0">{m.emoji}</span>}
          <div className="min-w-0">
            {m.text && <p className="text-[13px] leading-5 text-slate-200 break-words">{m.text}</p>}
            {clears && <p className="text-[11px] text-slate-500 mt-0.5">{clears}</p>}
          </div>
        </div>
      )}

      {m.workingOn && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-[11px] text-slate-500 mb-1">Working on now</div>
          <div className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] leading-5 text-emerald-200 break-words">
                {m.workingClient && <span className="text-emerald-300/70">{m.workingClient} · </span>}
                {m.workingOn}
              </p>
              {elapsed !== null && (
                <p className="text-[11px] text-slate-500 tabular-nums">{formatElapsed(elapsed)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!hasStatus && !m.workingOn && (
        <p className="mt-3 text-[12px] text-slate-500">No status and no timer running.</p>
      )}

      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <div className="text-[11px] text-slate-500 mb-1.5">Today</div>
        {today === 'loading' || today === undefined ? (
          <p className="text-[12px] text-slate-600">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-[12px] text-slate-500">Nothing logged yet.</p>
        ) : (
          <>
            <ul className="space-y-1">
              {shown.map(e => (
                <li key={e.id} className="flex items-baseline gap-2 text-[12px]">
                  <span className={cn('min-w-0 flex-1 truncate', e.running ? 'text-emerald-200' : 'text-slate-300')}>
                    {e.client && <span className="text-slate-500">{e.client} · </span>}
                    {e.description}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-400">{e.quantity}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-slate-500">
              {deliverables} {deliverables === 1 ? 'deliverable' : 'deliverables'} today
              {more > 0 && ` · ${more} more ${more === 1 ? 'task' : 'tasks'}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function TeamStatus() {
  const [me, setMe] = useState<{ id?: string; name: string } | null>(null);
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [draftEmoji, setDraftEmoji] = useState<string>('🎧');
  const [draftText, setDraftText] = useState('');
  const [clearAfter, setClearAfter] = useState<ClearAfter>('today');
  const [pickEmoji, setPickEmoji] = useState(false);

  const load = useCallback(async () => {
    const user = getLoggedInUser();
    const myId = user?.profileId;
    setMe(user ? { id: myId, name: user.name } : null);
    try {
      const list = await fetchTeamStatuses(myId);
      setMembers(list);
    } catch {
      // keep the last list
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(() => {
      if (!document.hidden) load();
    }, 60_000);
    const onFocus = () => load();
    const onTimer = () => window.setTimeout(load, 800);
    window.addEventListener('focus', onFocus);
    window.addEventListener('design_orbit_timer_event', onTimer);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('design_orbit_timer_event', onTimer);
    };
  }, [load]);

  const myRow = useMemo(
    () => members.find(m => m.id === me?.id) || members.find(m => me && m.name.toLowerCase() === me.name.toLowerCase()),
    [members, me]
  );

  const sorted = useMemo(() => {
    const score = (m: MemberStatus) => (m.workingOn ? 0 : m.text || m.emoji ? 1 : 2);
    return members
      .filter(m => m.id !== myRow?.id)
      .sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
  }, [members, myRow]);

  // Teammate card: opens on hover (mouse) after a short delay, click or tap pins it
  const [cardId, setCardId] = useState<string | null>(null);
  const [cardPinned, setCardPinned] = useState(false);
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null);
  const [today, setToday] = useState<Record<string, MemberTodayEntry[] | 'loading'>>({});
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);
  const cardMember = cardId ? members.find(m => m.id === cardId) || null : null;

  const clearHoverTimer = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const loadToday = useCallback((id: string) => {
    setToday(prev => ({ ...prev, [id]: 'loading' }));
    fetchMemberToday(id)
      .then(list => setToday(prev => ({ ...prev, [id]: list })))
      .catch(() => setToday(prev => ({ ...prev, [id]: [] })));
  }, []);

  const openCard = (id: string, pinned: boolean) => {
    clearHoverTimer();
    setEditing(false);
    setCardPinned(pinned);
    if (id !== cardId) {
      setCardPos(null);
      setCardId(id);
      loadToday(id);
    }
  };

  const closeCard = () => {
    clearHoverTimer();
    setCardId(null);
    setCardPinned(false);
  };

  const onRowEnter = (id: string) => {
    if (cardPinned) return;
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(() => openCard(id, false), cardId ? 0 : HOVER_OPEN_MS);
  };

  const onRowLeave = () => {
    if (cardPinned) return;
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(closeCard, HOVER_CLOSE_MS);
  };

  const onRowClick = (id: string) => {
    if (cardId === id && cardPinned) closeCard();
    else openCard(id, true);
  };

  useEffect(() => () => clearHoverTimer(), []);

  // Place the card beside the sidebar, level with the row; flip under it on narrow screens
  useLayoutEffect(() => {
    if (!cardId) return;
    const place = () => {
      const row = rowRefs.current[cardId]?.getBoundingClientRect();
      const card = cardRef.current;
      if (!row || !card) return;
      const w = card.offsetWidth;
      const h = card.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const aside = rowRefs.current[cardId]?.closest('aside')?.getBoundingClientRect();
      let left = (aside ? aside.right : row.right) + 8;
      let top = row.top - 8;
      if (left + w > vw - 8) {
        left = Math.max(8, Math.min(row.left, vw - w - 8));
        top = row.bottom + 6;
      }
      top = Math.max(8, Math.min(top, vh - h - 8));
      setCardPos({ left, top });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [cardId, today, members]);

  // A pinned card closes on outside click or Escape; any card closes on Escape
  useEffect(() => {
    if (!cardId) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (cardRef.current?.contains(t)) return;
      if (Object.values(rowRefs.current).some(r => r?.contains(t))) return;
      closeCard();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeCard();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
    // closeCard only touches setters and the timer ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);


  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [shown, setShown] = useState(false);
  const placed = pos !== null;

  // Fade in only after the panel has its final position, so it never jumps
  useEffect(() => {
    if (!placed) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [placed]);

  // Place the panel to the right of "You"; flip under it when there is no room, keep it on screen
  useLayoutEffect(() => {
    if (!editing) {
      setPos(null);
      return;
    }
    const place = () => {
      const b = btnRef.current?.getBoundingClientRect();
      const p = panelRef.current;
      if (!b || !p) return;
      const w = p.offsetWidth;
      const h = p.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Sit just past the sidebar's edge, top aligned with "You"
      const aside = btnRef.current?.closest('aside')?.getBoundingClientRect();
      let left = (aside ? aside.right : b.right) + 8;
      let top = b.top - 4;
      if (left + w > vw - 8) {
        left = Math.max(8, Math.min(b.left, vw - w - 8));
        top = b.bottom + 6;
      }
      top = Math.max(8, Math.min(top, vh - h - 8));
      setPos({ left, top });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [editing, pickEmoji]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!editing) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setEditing(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setEditing(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [editing]);

  const openEditor = () => {
    closeCard();
    setDraftEmoji(myRow?.emoji || '🎧');
    setDraftText(myRow?.text || '');
    setClearAfter('today');
    setPickEmoji(false);
    setEditing(true);
  };

  const apply = async (emoji: string | null, text: string | null, expiresAt: string | null) => {
    if (!myRow) return;
    setSaving(true);
    // optimistic
    setMembers(prev => prev.map(m => (m.id === myRow.id ? { ...m, emoji, text, expiresAt } : m)));
    try {
      await saveMyStatus(myRow.id, { emoji, text, expiresAt });
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (!loaded || members.length === 0) return null;

  const firstName = (n: string) => n.split(' ')[0];


  // Custom status wins; with none set, show the live timer
  const subline = (m: MemberStatus) => {
    if (m.text) return <span className="text-slate-400 truncate">{m.text}</span>;
    if (m.workingOn) {
      return (
        <span className="text-emerald-300/90 truncate">
          {m.workingClient ? `${m.workingClient} · ` : ''}
          {m.workingOn}
        </span>
      );
    }
    return <span className="text-slate-600">No status</span>;
  };

  return (
    <section className="pt-1" aria-label="Team status">
      <h3 className="px-2.5 mb-2 text-xs text-slate-500">Team</h3>

      {/* Me */}
      {myRow && (
        <button
          ref={btnRef}
          type="button"
          onClick={() => (editing ? setEditing(false) : openEditor())}
          aria-expanded={editing}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-dashed text-left transition-colors cursor-pointer mb-1',
            editing
              ? 'border-white/[0.2] bg-white/[0.04]'
              : 'border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.02]'
          )}
          title="Set your status"
        >
          <Avatar m={myRow} size="md" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[13px] text-slate-200">You</div>
            <div className="text-[11px] truncate">
              {myRow.text || myRow.workingOn ? (
                subline(myRow)
              ) : (
                <span className="text-slate-500">Set a status…</span>
              )}
            </div>
          </div>
        </button>
      )}

      {/* Editor: floats beside the sidebar so the list does not move */}
      {myRow && editing && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Set your status"
          style={{
            left: pos?.left ?? -9999,
            top: pos?.top ?? 0,
            opacity: shown ? 1 : 0,
            transform: shown ? 'translateX(0)' : 'translateX(-6px)',
          }}
          className="fixed z-[100] w-72 rounded-xl border border-white/[0.1] bg-[#121211] p-3 space-y-2.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none"
        >
          <div className="text-[13px] text-slate-200 px-0.5">Set your status</div>
          <div className="grid grid-cols-2 gap-1">
            {PRESETS.map(p => (
              <button
                key={p.text}
                type="button"
                disabled={saving}
                onClick={() => apply(p.emoji, p.text, expiryFor(clearAfter))}
                className="flex items-center gap-1.5 h-8 px-2 rounded-md text-[12px] text-slate-300 hover:bg-white/[0.06] hover:text-white text-left transition-colors cursor-pointer truncate"
              >
                <span className="text-sm leading-none">{p.emoji}</span>
                <span className="truncate">{p.text}</span>
              </button>
            ))}
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              if (!draftText.trim()) return;
              apply(draftEmoji, draftText.trim(), expiryFor(clearAfter));
            }}
            className="space-y-2"
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPickEmoji(v => !v)}
                className="w-8 h-8 shrink-0 rounded-md bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-base leading-none cursor-pointer"
                aria-label="Pick an emoji"
              >
                {draftEmoji}
              </button>
              <input
                value={draftText}
                onChange={e => setDraftText(e.target.value.slice(0, 60))}
                onKeyDown={e => e.key === 'Escape' && setEditing(false)}
                placeholder="Or write your own"
                aria-label="Custom status"
                autoFocus
                className="flex-1 min-w-0 h-8 px-2.5 rounded-md bg-white/[0.03] border border-white/[0.08] text-[12px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400/50"
              />
            </div>

            {pickEmoji && (
              <div className="grid grid-cols-8 gap-0.5">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setDraftEmoji(e);
                      setPickEmoji(false);
                    }}
                    className={cn(
                      'h-7 rounded-md text-sm leading-none hover:bg-white/[0.08] cursor-pointer',
                      e === draftEmoji && 'bg-white/[0.08]'
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            <div>
              <div className="text-[11px] text-slate-500 mb-1">Clear after</div>
              <div className="grid grid-cols-4 gap-0.5 rounded-md bg-white/[0.03] p-0.5">
                {(Object.keys(CLEAR_LABELS) as ClearAfter[]).map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setClearAfter(k)}
                    className={cn(
                      'h-6 rounded text-[11px] transition-colors cursor-pointer',
                      clearAfter === k ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-slate-300'
                    )}
                  >
                    {CLEAR_LABELS[k]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              {myRow.text || myRow.emoji ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => apply(null, null, null)}
                  className="text-[11px] text-slate-500 hover:text-rose-300 cursor-pointer"
                >
                  Clear status
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="h-7 px-2.5 rounded-md text-[12px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !draftText.trim()}
                  className="h-7 px-3 rounded-md bg-emerald-500 text-[12px] font-medium text-[#0b1410] hover:bg-emerald-400 disabled:bg-white/[0.06] disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>

            {!isStatusSyncedToTeam() && (
              <p className="text-[10px] text-slate-600 leading-snug">Only you can see this until team status is switched on.</p>
            )}
          </form>
        </div>,
        document.body
      )}

      {/* Everyone else */}
      <ul className="space-y-0.5">
        {sorted.map(m => (
          <li key={m.id}>
            <button
              ref={el => {
                rowRefs.current[m.id] = el;
              }}
              type="button"
              onPointerEnter={e => e.pointerType === 'mouse' && onRowEnter(m.id)}
              onPointerLeave={e => e.pointerType === 'mouse' && onRowLeave()}
              onClick={() => onRowClick(m.id)}
              aria-expanded={cardId === m.id}
              aria-haspopup="dialog"
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer',
                cardId === m.id ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
              )}
            >
              <Avatar m={m} />
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-[13px] text-slate-300 truncate">{firstName(m.name)}</div>
                <div className="text-[11px] flex min-w-0">{subline(m)}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* Teammate card */}
      {cardMember && createPortal(
        <MemberCard
          key={cardMember.id}
          ref={cardRef}
          m={cardMember}
          today={today[cardMember.id]}
          pos={cardPos}
          onEnter={() => !cardPinned && clearHoverTimer()}
          onLeave={() => !cardPinned && onRowLeave()}
          onClose={closeCard}
        />,
        document.body
      )}
    </section>
  );
}
