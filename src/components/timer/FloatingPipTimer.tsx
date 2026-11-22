'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { WorkEntryWithDetails } from '@/types';
import {
  getActiveRunningWorkEntries,
  startWorkEntryTimer,
  stopWorkEntryTimer,
  calculateWorkEntrySeconds,
  formatWorkEntryStopwatch,
  getLoggedInUser,
  getLoggedInProfileId,
  isEntryForUser,
} from '@/lib/services/work-entry';
import {
  Play,
  Pause,
  Square,
  Minimize2,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';
import { BrandMark } from '@/components/ui/BrandMark';

// Global declaration for TypeScript
declare global {
  interface Window {
    designOrbitPipManager?: {
      openPip: (initialEntry?: WorkEntryWithDetails) => Promise<boolean>;
      closePip: () => void;
      isPipOpen: () => boolean;
    };
  }
}

// Self-contained styling for the pop-out window: graphite surfaces, one green accent, no glows
const PIP_EMBEDDED_STYLES = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    width: 100%;
    height: 100%;
    background: #0e0e0d;
  }

  body {
    color: #f1f5f9;
    font-family: var(--font-ui, "Instrument Sans"), "Instrument Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
  }

  #pip-portal-root {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
  }

  .pip-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    gap: 10px;
  }

  .pip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    height: 24px;
  }

  .pip-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .pip-brand svg {
    flex-shrink: 0;
  }

  .pip-brand .pip-status {
    padding-left: 8px;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  .pip-logo-text {
    font-family: var(--font-brand, "Bricolage Grotesque"), "Bricolage Grotesque", var(--font-ui, "Instrument Sans"), system-ui, sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: #e2e8f0;
    white-space: nowrap;
  }

  .pip-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .pip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #55cb98;
    flex-shrink: 0;
  }

  .pip-dot.live {
    animation: pip-breathe 2.4s ease-in-out infinite;
  }

  .pip-dot.paused {
    background: #64748b;
  }

  @keyframes pip-breathe {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }

  @media (prefers-reduced-motion: reduce) {
    .pip-dot.live { animation: none; }
  }

  .pip-time-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }

  .pip-desc {
    font-size: 12px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .pip-ticker {
    position: relative;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 22px), transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 14px, #000 calc(100% - 22px), transparent 100%);
  }

  .pip-ticker-track {
    display: flex;
    width: max-content;
    animation: pip-ticker var(--ticker-duration, 16s) linear infinite;
  }

  .pip-ticker:hover .pip-ticker-track,
  .pip-ticker-track.still {
    animation-play-state: paused;
  }

  .pip-ticker-group {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    white-space: nowrap;
    font-size: 12px;
    color: #94a3b8;
    font-variant-numeric: tabular-nums;
  }

  .pip-ticker-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .pip-ticker-item.brand {
    font-family: var(--font-brand, "Bricolage Grotesque"), "Bricolage Grotesque", var(--font-ui, "Instrument Sans"), system-ui, sans-serif;
    font-weight: 500;
    color: #e2e8f0;
  }

  .pip-ticker-item.client {
    color: #cbd5e1;
  }

  .pip-ticker-sep {
    padding: 0 10px;
    color: #475569;
  }

  @keyframes pip-ticker {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  @media (prefers-reduced-motion: reduce) {
    .pip-ticker-track { animation: none; }
  }

  .pip-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid transparent;
    color: #94a3b8;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }

  .pip-icon-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
    color: #f8fafc;
  }

  .pip-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0;
  }

  .pip-list::-webkit-scrollbar { width: 3px; }
  .pip-list::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 3px; }

  .pip-card {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 10px 10px 14px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
    overflow: hidden;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .pip-card::before {
    content: "";
    position: absolute;
    left: 0;
    top: 10px;
    bottom: 10px;
    width: 2px;
    border-radius: 0 2px 2px 0;
    background: rgba(255, 255, 255, 0.12);
  }

  .pip-card.running {
    background: rgba(255, 255, 255, 0.045);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .pip-card.running::before {
    background: #55cb98;
  }

  .pip-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .pip-meta {
    display: flex;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
    font-size: 11px;
    line-height: 1.2;
    white-space: nowrap;
  }

  .pip-client {
    color: #cbd5e1;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
    max-width: 60%;
  }

  .pip-type {
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pip-stopwatch {
    font-family: var(--font-brand, "Bricolage Grotesque"), "Bricolage Grotesque", var(--font-ui, "Instrument Sans"), system-ui, sans-serif;
    font-size: 22px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
    color: #f8fafc;
  }

  .pip-stopwatch.paused {
    color: #64748b;
  }

  .pip-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .pip-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: #e2e8f0;
    outline: none;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  }

  .pip-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  .pip-btn:active { transform: scale(0.94); }
  .pip-btn:disabled { opacity: 0.5; cursor: default; }
  .pip-btn:focus-visible { box-shadow: 0 0 0 2px rgba(85, 203, 152, 0.5); }

  .pip-btn-start {
    background: #3eb181;
    border-color: #3eb181;
    color: #0c0c0b;
  }

  .pip-btn-start:hover {
    background: #55cb98;
    border-color: #55cb98;
    color: #0c0c0b;
  }

  .pip-btn-stop {
    width: 26px;
    height: 26px;
    background: transparent;
    border-color: transparent;
    color: #64748b;
  }

  .pip-btn-stop:hover {
    background: rgba(244, 63, 94, 0.12);
    border-color: rgba(244, 63, 94, 0.25);
    color: #fb7185;
  }

  .pip-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
  }

  .pip-empty span:last-child {
    font-size: 11px;
    color: #64748b;
  }
`;

export function FloatingPipTimer() {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login' || pathname === '/';

  const [entries, setEntries] = useState<WorkEntryWithDetails[]>([]);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const { showToast, confirmDialog } = useToast();

  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; profileId?: string } | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const currentProfileIdRef = useRef<string | null>(null);
  currentProfileIdRef.current = currentProfileId;
  const currentUserNameRef = useRef<string | null>(null);
  currentUserNameRef.current = currentUser?.name || null;

  const pipContainerRef = useRef<HTMLDivElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  pipWindowRef.current = pipWindow;

  const entriesRef = useRef<WorkEntryWithDetails[]>(entries);
  entriesRef.current = entries;

  const isOpeningPipRef = useRef<boolean>(false);
  const pipOpenedAtRef = useRef<number>(0);
  const recentlyStartedRef = useRef<Map<string, number>>(new Map());

  const closePipWindow = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    setPipWindow(null);
    pipWindowRef.current = null;
    pipContainerRef.current = null;
  }, []);

  // Immediately close PiP and purge entries if on login or landing route
  useEffect(() => {
    if (isLoginPage) {
      closePipWindow();
      setEntries([]);
      setCurrentUser(null);
      setCurrentProfileId(null);
      currentProfileIdRef.current = null;
      currentUserNameRef.current = null;
    }
  }, [isLoginPage, closePipWindow]);

  // Sync active and recently running timers from storage / database strictly for the logged-in user
  const refreshTimers = useCallback(async (explicitUserId?: string, explicitUserName?: string) => {
    if (isLoginPage) {
      setEntries([]);
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        closePipWindow();
      }
      return;
    }

    const user = getLoggedInUser();
    if (!user || !user.name) {
      setEntries([]);
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        closePipWindow();
      }
      return;
    }

    const targetId = explicitUserId || currentProfileIdRef.current || user.profileId || (await getLoggedInProfileId());
    const targetName = explicitUserName || currentUserNameRef.current || user.name;

    if (!targetId && !targetName) {
      setEntries([]);
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        closePipWindow();
      }
      return;
    }

    try {
      const active = await getActiveRunningWorkEntries(targetId || undefined);
      const userActive = active.filter(item => isEntryForUser(item, targetId, targetName));

      setEntries(prev => {
        const activeIds = new Set(userActive.map(a => a.id));

        // Keep items from prev that are active in PiP or recently started
        const keptFromPrev = prev.filter(p => {
          if (activeIds.has(p.id)) return false;
          // Keep paused tasks or recently active tasks in PiP
          return Boolean(p.timer_started_at) || Boolean(recentlyStartedRef.current.get(p.id)) || !p.timer_started_at;
        });

        const merged = [...userActive, ...keptFromPrev];
        entriesRef.current = merged;
        return merged;
      });
    } catch (err) {
      console.warn('FloatingPipTimer refresh error:', err);
    }
  }, [isLoginPage]);

  // Precise dynamic height calculation matching the compact styling and OS window frame
  const computeTargetHeight = useCallback((taskCount: number) => {
    const count = Math.max(1, taskCount);
    // Titlebar chrome ~42px + body padding/header ~56px + count * (card ~64px + gap 8px)
    const calculated = 98 + count * 72;
    return Math.min(460, Math.max(154, calculated));
  }, []);

  // Safely inject styles into PiP window
  const injectStylesIntoWindow = (targetWin: Window) => {
    try {
      // 1. Inject complete, self-contained, bulletproof PiP stylesheet
      const dedicatedStyle = targetWin.document.createElement('style');
      dedicatedStyle.textContent = PIP_EMBEDDED_STYLES;
      targetWin.document.documentElement.className = document.documentElement.className;
      targetWin.document.head.appendChild(dedicatedStyle);

      // 2. Also try cloning any main document stylesheets
      const styleNodes = document.head.querySelectorAll('style, link[rel="stylesheet"]');
      styleNodes.forEach(node => {
        try {
          targetWin.document.head.appendChild(node.cloneNode(true));
        } catch (e) {}
      });

      targetWin.document.title = 'Design Orbit — Floating Timer';
    } catch (err) {
      console.warn('Could not inject styles into PiP window:', err);
    }
  };

  // Open Document Picture-in-Picture window or popup fallback
  const openPipWindow = useCallback(async (initialEntry?: WorkEntryWithDetails): Promise<boolean> => {
    if (typeof window === 'undefined' || isLoginPage) return false;

    const user = getLoggedInUser();
    if (!user || !user.name) {
      showToast('Please sign in to use the floating timer', 'error');
      return false;
    }

    if (initialEntry) {
      const activeInitial: WorkEntryWithDetails = {
        ...initialEntry,
        timer_started_at: initialEntry.timer_started_at || new Date().toISOString(),
      };

      recentlyStartedRef.current.set(activeInitial.id, Date.now());
      try {
        localStorage.setItem(`work_timer_started_${activeInitial.id}`, activeInitial.timer_started_at!);
      } catch (e) {}

      setEntries(prev => {
        const exists = prev.some(item => item.id === activeInitial.id);
        const next = exists
          ? prev.map(item => (item.id === activeInitial.id ? { ...item, ...activeInitial } : item))
          : [activeInitial, ...prev];
        entriesRef.current = next;
        return next;
      });
    } else {
      if (entriesRef.current.length === 0) {
        showToast('No timer running. Start one on a deliverable first');
        return false;
      }
    }

    const currentCount = Math.max(1, entriesRef.current.length, initialEntry ? 1 : 0);
    const targetHeight = computeTargetHeight(currentCount);
    const targetWidth = 330;

    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      try {
        pipWindowRef.current.focus();
        pipWindowRef.current.resizeTo(targetWidth, targetHeight);
      } catch (e) {}
      return true;
    }

    if (isOpeningPipRef.current) return false;
    isOpeningPipRef.current = true;
    pipOpenedAtRef.current = Date.now();

    try {
      // 1. Try Document Picture-in-Picture API first (Chrome 116+, Edge 116+)
      if ('documentPictureInPicture' in window && (window as any).documentPictureInPicture?.requestWindow) {
        try {
          const pip = await (window as any).documentPictureInPicture.requestWindow({
            width: targetWidth,
            height: targetHeight,
          });

          injectStylesIntoWindow(pip);

          const container = pip.document.createElement('div');
          container.id = 'pip-portal-root';
          pip.document.body.appendChild(container);

          const handlePipClose = () => {
            setPipWindow(null);
            pipWindowRef.current = null;
            pipContainerRef.current = null;
          };

          pip.addEventListener('pagehide', handlePipClose);

          pipContainerRef.current = container;
          pipWindowRef.current = pip;
          setPipWindow(pip);
          return true;
        } catch (pipErr: any) {
          console.warn('Document Picture-in-Picture request failed, trying popup fallback:', pipErr);
        }
      }

      // 2. Fallback: lightweight standalone desktop popup window
      try {
        const left = Math.max(0, window.screen.availWidth - targetWidth - 24);
        const top = Math.max(0, window.screen.availHeight - targetHeight - 48);
        const popup = window.open(
          'about:blank',
          'design_orbit_floating_timer',
          `width=${targetWidth},height=${targetHeight},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
        );

        if (popup) {
          try {
            popup.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Design Orbit — Floating Timer</title><style>${PIP_EMBEDDED_STYLES}</style></head><body><div id="pip-portal-root"></div></body></html>`);
            popup.document.close();
          } catch (e) {
            injectStylesIntoWindow(popup);
          }

          let container = popup.document.getElementById('pip-portal-root') as HTMLDivElement | null;
          if (!container) {
            container = popup.document.createElement('div');
            container.id = 'pip-portal-root';
            popup.document.body.appendChild(container);
          }

          const handlePopupClose = () => {
            setPipWindow(null);
            pipWindowRef.current = null;
            pipContainerRef.current = null;
          };

          popup.addEventListener('pagehide', handlePopupClose);
          popup.addEventListener('beforeunload', handlePopupClose);

          const closeCheckInterval = setInterval(() => {
            if (!popup || popup.closed) {
              clearInterval(closeCheckInterval);
              handlePopupClose();
            }
          }, 1000);

          pipContainerRef.current = container;
          pipWindowRef.current = popup;
          setPipWindow(popup);
          return true;
        } else {
          showToast('Popup blocked by browser. Please allow popups for Design Orbit in your address bar.', 'error');
          return false;
        }
      } catch (popupErr: any) {
        console.warn('Popup window fallback failed:', popupErr);
        showToast('Could not open floating timer. Please check browser popup permissions.', 'error');
        return false;
      }
    } finally {
      isOpeningPipRef.current = false;
    }
  }, [computeTargetHeight, isLoginPage, showToast]);

  // Dynamically adjust PiP window size as tasks change
  useEffect(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      const targetHeight = computeTargetHeight(entries.length);
      try {
        pipWindowRef.current.resizeTo(320, targetHeight);
      } catch (e) {}
    }
  }, [entries.length, pipWindow]);

  // Expose manager globally to window permanently
  if (typeof window !== 'undefined') {
    window.designOrbitPipManager = {
      openPip: openPipWindow,
      closePip: closePipWindow,
      isPipOpen: () => Boolean(pipWindowRef.current && !pipWindowRef.current.closed),
    };
  }

  useEffect(() => {
    window.designOrbitPipManager = {
      openPip: openPipWindow,
      closePip: closePipWindow,
      isPipOpen: () => Boolean(pipWindowRef.current && !pipWindowRef.current.closed),
    };
  }, [openPipWindow, closePipWindow]);

  // Synchronize active logged in user and handle login / logout / user switching
  useEffect(() => {
    let mounted = true;

    async function syncUser() {
      if (isLoginPage) {
        if (mounted) {
          setCurrentUser(null);
          setCurrentProfileId(null);
          currentProfileIdRef.current = null;
          currentUserNameRef.current = null;
          setEntries([]);
          closePipWindow();
        }
        return;
      }

      const user = getLoggedInUser();
      if (!user || !user.name) {
        if (mounted) {
          setCurrentUser(null);
          setCurrentProfileId(null);
          currentProfileIdRef.current = null;
          currentUserNameRef.current = null;
          setEntries([]);
          closePipWindow();
        }
        return;
      }

      if (mounted) setCurrentUser(user);

      let pId = user.profileId || null;
      if (!pId) {
        pId = await getLoggedInProfileId();
      }

      if (mounted) {
        setCurrentProfileId(pId);
        currentProfileIdRef.current = pId;
        currentUserNameRef.current = user.name;
        refreshTimers(pId || undefined, user.name);
      }
    }

    syncUser();

    const handleAuthChange = () => {
      syncUser();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === 'design_orbit_logged_in_name' ||
        e.key === 'design_orbit_logged_in_profile_id' ||
        e.key === 'design_orbit_logged_in_email'
      ) {
        syncUser();
      }
    };

    window.addEventListener('design_orbit_auth_change', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mounted = false;
      window.removeEventListener('design_orbit_auth_change', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [closePipWindow, refreshTimers, isLoginPage]);

  // Sync timers on timer events and auto-open PiP when leaving the page
  useEffect(() => {
    if (isLoginPage) {
      setEntries([]);
      closePipWindow();
      return;
    }

    refreshTimers();

    const handleTimerAction = (detail: any) => {
      if (isLoginPage) return;
      const { id, entry, action } = detail || {};
      if (!id) {
        refreshTimers();
        return;
      }

      const targetId = currentProfileIdRef.current;
      const targetName = currentUserNameRef.current;

      if (action === 'stop') {
        recentlyStartedRef.current.delete(id);
        // Immediately remove stopped task from PiP window and resize
        setEntries(prev => {
          const remaining = prev.filter(item => item.id !== id);
          if (remaining.length === 0 && pipWindowRef.current && !pipWindowRef.current.closed) {
            closePipWindow();
          } else if (pipWindowRef.current && !pipWindowRef.current.closed) {
            try {
              pipWindowRef.current.resizeTo(320, computeTargetHeight(remaining.length));
            } catch (e) {}
          }
          return remaining;
        });
        return;
      }

      if (action === 'pause') {
        // Stop stopwatch ticking and reflect paused state
        setEntries(prev =>
          prev.map(item =>
            item.id === id
              ? { ...item, ...(entry || {}), timer_started_at: null }
              : item
          )
        );
        return;
      }

      if (action === 'start' || action === 'resume') {
        // User specificity check: ignore timers started by other users
        if (entry && !isEntryForUser(entry, targetId, targetName)) {
          return;
        }

        recentlyStartedRef.current.set(id, Date.now());
        setEntries(prev => {
          const exists = prev.some(item => item.id === id);
          const next = exists
            ? prev.map(item => (item.id === id ? { ...item, ...(entry || {}) } : item))
            : entry ? [entry, ...prev] : prev;

          if (pipWindowRef.current && !pipWindowRef.current.closed) {
            try {
              pipWindowRef.current.resizeTo(320, computeTargetHeight(next.length));
            } catch (e) {}
          }
          return next;
        });

        if (!pipWindowRef.current || pipWindowRef.current.closed) {
          openPipWindow(entry).catch(() => {});
        }
        return;
      }

      if (entry) {
        if (!isEntryForUser(entry, targetId, targetName)) {
          return;
        }
        setEntries(prev => {
          const exists = prev.some(item => item.id === id);
          if (exists) {
            return prev.map(item => (item.id === id ? { ...item, ...entry } : item));
          }
          return [entry, ...prev];
        });
      }
    };

    const handleCustomEvent = (e: any) => {
      handleTimerAction(e.detail);
    };

    // Listen to cross-tab/cross-window BroadcastChannel
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('design_orbit_timer_bus');
        channel.onmessage = (ev) => {
          if (ev.data) handleTimerAction(ev.data);
        };
      }
    } catch (e) {}

    // Storage event fallback
    const handleStorage = (ev: StorageEvent) => {
      if (ev.key === 'design_orbit_timer_sync_event' && ev.newValue) {
        try {
          const parsed = JSON.parse(ev.newValue);
          if (parsed?.detail) handleTimerAction(parsed.detail);
        } catch (e) {}
      }
    };

    const handleVisibilityChange = () => {
      if (isLoginPage) return;
      if (document.visibilityState === 'hidden') {
        const targetId = currentProfileIdRef.current;
        const targetName = currentUserNameRef.current;
        const hasActive = entriesRef.current.some(e => isEntryForUser(e, targetId, targetName) && Boolean(e.timer_started_at));
        if (hasActive && (!pipWindowRef.current || pipWindowRef.current.closed)) {
          openPipWindow().catch(() => {});
        }
      }
    };

    window.addEventListener('design_orbit_timer_event', handleCustomEvent);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Sync every 10s (the clock itself ticks locally). Skip background tabs unless the pop-out timer is open.
    const pollInterval = setInterval(() => {
      const pipOpen = Boolean((window as any).documentPictureInPicture?.window);
      if (document.hidden && !pipOpen) return;
      if (!isLoginPage) {
        refreshTimers();
      }
    }, 10000);

    return () => {
      window.removeEventListener('design_orbit_timer_event', handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channel) {
        try {
          channel.close();
        } catch (e) {}
      }
      clearInterval(pollInterval);
    };
  }, [refreshTimers, openPipWindow, closePipWindow, isLoginPage]);

  // Unthrottled live stopwatch ticker (runs across Web Worker, main tab, and PiP window)
  useEffect(() => {
    let tickerWorker: Worker | null = null;
    let workerUrl: string | null = null;

    try {
      if (typeof window !== 'undefined' && window.Worker) {
        const workerBlob = new Blob(
          ['var timer = setInterval(function() { postMessage("tick"); }, 400);'],
          { type: 'application/javascript' }
        );
        workerUrl = URL.createObjectURL(workerBlob);
        tickerWorker = new Worker(workerUrl);
        tickerWorker.onmessage = () => {
          setNowMs(Date.now());
        };
      }
    } catch (err) {
      console.warn('Worker ticker fallback:', err);
    }

    const mainInterval = setInterval(() => {
      setNowMs(Date.now());
    }, 400);

    let pipInterval: any = null;
    if (pipWindow && !pipWindow.closed) {
      try {
        pipInterval = pipWindow.setInterval(() => {
          setNowMs(Date.now());
        }, 400);
      } catch (e) {}
    }

    return () => {
      if (tickerWorker) {
        tickerWorker.terminate();
      }
      if (workerUrl) {
        URL.revokeObjectURL(workerUrl);
      }
      clearInterval(mainInterval);
      if (pipWindow && pipInterval) {
        try {
          pipWindow.clearInterval(pipInterval);
        } catch (e) {}
      }
    };
  }, [pipWindow]);

  // Actions from inside PiP or corner widget
  const handlePause = async (entry: WorkEntryWithDetails) => {
    setOperatingId(entry.id);
    const now = Date.now();
    let additional = 0;
    if (entry.timer_started_at) {
      const started = new Date(entry.timer_started_at).getTime();
      if (!isNaN(started) && started > 0) {
        additional = Math.max(0, Math.floor((now - started) / 1000));
      }
    }
    const newTotalSeconds = (entry.time_spent_seconds || 0) + additional;

    // 1. Immediate optimistic pause
    setEntries(prev =>
      prev.map(e =>
        e.id === entry.id
          ? { ...e, timer_started_at: null, time_spent_seconds: newTotalSeconds }
          : e
      )
    );

    // 2. Persist to storage & DB
    try {
      const updated = await stopWorkEntryTimer(entry.id, entry, currentProfileIdRef.current || undefined, 'pause');
      setEntries(prev =>
        prev.map(e =>
          e.id === entry.id
            ? { ...e, ...updated, timer_started_at: null, time_spent_seconds: newTotalSeconds }
            : e
        )
      );
      showToast(`Paused: ${entry.client?.name || 'Deliverable'}`, 'success');
    } catch (err: any) {
      console.error('Failed to pause timer:', err);
      showToast(err.message || 'Failed to pause timer', 'error');
    } finally {
      setOperatingId(null);
    }
  };

  const handleResume = async (entry: WorkEntryWithDetails) => {
    setOperatingId(entry.id);
    const nowIso = new Date().toISOString();

    // 1. Immediate optimistic resume
    setEntries(prev =>
      prev.map(e => (e.id === entry.id ? { ...e, timer_started_at: nowIso } : e))
    );

    try {
      const updated = await startWorkEntryTimer(entry.id, entries, currentProfileIdRef.current || undefined);
      setEntries(prev => prev.map(e => (e.id === entry.id ? { ...e, ...updated } : e)));
      showToast(`Resumed: ${entry.client?.name || 'Deliverable'}`, 'success');
    } catch (err: any) {
      console.error('Failed to resume timer:', err);
      showToast(err.message || 'Failed to resume timer', 'error');
    } finally {
      setOperatingId(null);
    }
  };

  const handleStop = async (entry: WorkEntryWithDetails) => {
    setOperatingId(entry.id);
    try {
      if (entry.timer_started_at) {
        await stopWorkEntryTimer(entry.id, entry, currentProfileIdRef.current || undefined, 'stop');
      }
      recentlyStartedRef.current.delete(entry.id);
      const remaining = entriesRef.current.filter(e => e.id !== entry.id);
      setEntries(remaining);
      showToast(`Finalized: ${entry.client?.name || 'Deliverable'}`, 'success');

      if (remaining.length === 0) {
        closePipWindow();
      } else if (pipWindowRef.current && !pipWindowRef.current.closed) {
        try {
          pipWindowRef.current.resizeTo(320, computeTargetHeight(remaining.length));
        } catch (e) {}
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to stop timer', 'error');
    } finally {
      setOperatingId(null);
    }
  };

  const runningCount = entries.filter(e => Boolean(e.timer_started_at)).length;

  // 7 pm nudge (device time): once a day, if a timer is still running, offer to pause it.
  const pauseRef = useRef(handlePause);
  pauseRef.current = handlePause;
  useEffect(() => {
    const NUDGE_HOUR = 19;
    const check = () => {
      const now = new Date();
      if (now.getHours() < NUDGE_HOUR) return;
      const running = entriesRef.current.filter(e => Boolean(e.timer_started_at));
      if (running.length === 0) return;

      const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const key = `design_orbit_7pm_nudge_${currentProfileIdRef.current || 'me'}`;
      try {
        if (localStorage.getItem(key) === today) return;
        localStorage.setItem(key, today);
      } catch {
        return; // no storage: skip rather than nag on every check
      }

      const what = running.length === 1
        ? (running[0].client?.name || running[0].description || 'your work')
        : `${running.length} things`;
      const hourLabel = now.getHours() === NUDGE_HOUR ? 'It’s 7 pm' : 'It’s past 7 pm';

      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Design Orbit', { body: `${hourLabel}. Your timer is still running on ${what}.` });
        } catch {}
      }

      confirmDialog({
        title: `${hourLabel}. Still working?`,
        message: `Your timer is still running on ${what}. Pause it if you’re done for the day.`,
        confirmText: running.length === 1 ? 'Pause timer' : 'Pause timers',
        cancelText: 'Keep going',
        variant: 'info',
        onConfirm: async () => {
          for (const entry of entriesRef.current.filter(e => Boolean(e.timer_started_at))) {
            await pauseRef.current(entry);
          }
        },
      });
    };

    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [confirmDialog]);

  // Compact render for the pop-out window and the docked corner widget
  const renderContent = (isInsidePip: boolean) => {
    const statusText = runningCount > 0
      ? `${runningCount} ${runningCount === 1 ? 'task' : 'tasks'} running`
      : 'Paused';

    if (isInsidePip) {
      if (entries.length === 0) {
        return (
          <div className="pip-container">
            <div className="pip-header">
              <div className="pip-brand">
                <BrandMark size={16} />
                <span className="pip-logo-text">Design Orbit</span>
              </div>
              <button type="button" onClick={closePipWindow} className="pip-icon-btn" title="Back to the browser tab">
                <Minimize2 style={{ width: 13, height: 13 }} />
              </button>
            </div>
            <div className="pip-empty">
              <span>No timer running</span>
              <span>Start one from your log</span>
            </div>
          </div>
        );
      }

      return (
        <div className="pip-container">
          <div className="pip-header">
            <div className="pip-brand">
              <BrandMark size={16} />
              <span className="pip-logo-text">Design Orbit</span>
              <span className="pip-status">
                <span className={`pip-dot ${runningCount > 0 ? 'live' : 'paused'}`} />
                {statusText}
              </span>
            </div>
            <button type="button" onClick={closePipWindow} className="pip-icon-btn" title="Back to the browser tab">
              <Minimize2 style={{ width: 13, height: 13 }} />
            </button>
          </div>

          <div className="pip-list">
            {entries.map(entry => {
              const isRunning = Boolean(entry.timer_started_at);
              const elapsed = calculateWorkEntrySeconds(entry, nowMs);
              const stopwatch = formatWorkEntryStopwatch(elapsed);
              const clientName = entry.client?.name || 'Client';
              const workTypeName = entry.work_type?.name || 'Deliverable';
              const isOperating = operatingId === entry.id;
              const description = (entry.description || '').trim();
              // Long descriptions scroll; short ones sit still. Speed stays near 30px a second.
              const scrolls = description.length > 14;
              const descDuration = Math.max(6, Math.round((description.length + 4) * 0.22));

              return (
                <div key={entry.id} className={`pip-card ${isRunning ? 'running' : ''}`}>
                  <div className="pip-info">
                    <div className="pip-meta">
                      <span className="pip-client">{clientName}</span>
                      <span className="pip-type">{workTypeName}</span>
                    </div>
                    <div className="pip-time-row">
                      <span className={`pip-stopwatch ${!isRunning ? 'paused' : ''}`}>{stopwatch}</span>
                      {description && (
                        scrolls ? (
                          <div
                            className="pip-ticker"
                            title={description}
                            aria-label={description}
                            style={{ ['--ticker-duration' as string]: `${descDuration}s` } as React.CSSProperties}
                          >
                            <div className={`pip-ticker-track ${isRunning ? '' : 'still'}`} aria-hidden="true">
                              {[0, 1].map(copy => (
                                <span key={copy} className="pip-ticker-group">
                                  {description}
                                  <span className="pip-ticker-sep">·</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="pip-desc">{description}</span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="pip-actions">
                    {isRunning ? (
                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handlePause(entry)}
                        className="pip-btn"
                        title="Pause"
                        aria-label="Pause"
                      >
                        <Pause style={{ width: 12, height: 12, fill: 'currentColor' }} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handleResume(entry)}
                        className="pip-btn pip-btn-start"
                        title="Resume"
                        aria-label="Resume"
                      >
                        <Play style={{ width: 12, height: 12, fill: 'currentColor', marginLeft: 2 }} />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isOperating}
                      onClick={() => handleStop(entry)}
                      className="pip-btn pip-btn-stop"
                      title="Stop and save"
                      aria-label="Stop and save"
                    >
                      <Square style={{ width: 10, height: 10, fill: 'currentColor' }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Docked corner widget inside the page
    return (
      <div className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/[0.08] bg-[#121211] p-3 shadow-[0_16px_40px_rgba(0,0,0,0.5)] space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-display text-xs font-medium text-slate-200 whitespace-nowrap">Design Orbit</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 tabular-nums whitespace-nowrap">
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full ${runningCount > 0 ? 'bg-emerald-400 animate-beacon' : 'bg-slate-500'}`}
              />
              {statusText}
            </span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => openPipWindow()}
              className="inline-flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title="Float the timer above other windows"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Pop out</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title={isMinimized ? 'Expand' : 'Collapse'}
              aria-label={isMinimized ? 'Expand' : 'Collapse'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="space-y-2 overflow-y-auto max-h-[240px]">
            {entries.map(entry => {
              const isRunning = Boolean(entry.timer_started_at);
              const elapsed = calculateWorkEntrySeconds(entry, nowMs);
              const stopwatch = formatWorkEntryStopwatch(elapsed);
              const clientName = entry.client?.name || 'General';
              const workTypeName = entry.work_type?.name || 'Deliverable';
              const isOperating = operatingId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={`relative flex items-center justify-between gap-3 rounded-xl border py-2.5 pl-3.5 pr-2.5 overflow-hidden transition-colors ${
                    isRunning ? 'bg-white/[0.045] border-white/[0.1]' : 'bg-white/[0.02] border-white/[0.06]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-r-full ${isRunning ? 'bg-emerald-400' : 'bg-white/[0.12]'}`}
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-baseline gap-1.5 text-xs min-w-0">
                      <span className="text-slate-300 font-medium truncate max-w-[60%]">{clientName}</span>
                      <span className="text-slate-500 truncate">{workTypeName}</span>
                    </div>
                    <div className={`font-display text-xl leading-none font-medium tabular-nums ${isRunning ? 'text-slate-50' : 'text-slate-500'}`}>
                      {stopwatch}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isRunning ? (
                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handlePause(entry)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-white/[0.1] bg-white/[0.05] text-slate-200 hover:bg-white/[0.1] hover:text-white transition-colors btn-tactile cursor-pointer disabled:opacity-50"
                        title="Pause"
                        aria-label="Pause"
                      >
                        <Pause className="w-3 h-3 fill-current" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handleResume(entry)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-[#0c0c0b] hover:bg-emerald-400 transition-colors btn-tactile cursor-pointer disabled:opacity-50"
                        title="Resume"
                        aria-label="Resume"
                      >
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isOperating}
                      onClick={() => handleStop(entry)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors btn-tactile cursor-pointer disabled:opacity-50"
                      title="Stop and save"
                      aria-label="Stop and save"
                    >
                      <Square className="w-2.5 h-2.5 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // If PiP is active, render via Portal into the detached OS window
  if (pipWindow && pipContainerRef.current) {
    return createPortal(renderContent(true), pipContainerRef.current);
  }

  // Otherwise, render docked in-page floating widget pinned to bottom right corner only if active
  if (isLoginPage || !currentUser || entries.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Live Floating Timers"
      className="fixed bottom-24 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {renderContent(false)}
    </aside>
  );
}
