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
  Building2,
  Minimize2,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastContext';

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

// Complete self-contained styling for the PiP window to ensure 100% reliable, stunning UI
const PIP_EMBEDDED_STYLES = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    width: 100%;
    height: 100%;
    background: #06080F;
  }

  body {
    background: radial-gradient(circle at 50% 0%, #161D32 0%, #06080F 100%);
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Inter", Helvetica, Arial, sans-serif;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    padding: 8px 10px 9px;
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
    gap: 6px;
    justify-content: flex-start;
  }

  .pip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .pip-brand {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .pip-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
    animation: pip-pulse 1.8s infinite ease-in-out;
  }

  .pip-dot.paused {
    background: #f59e0b;
    box-shadow: 0 0 6px #f59e0b;
    animation: none;
  }

  @keyframes pip-pulse {
    0% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 4px #10b981; }
    50% { transform: scale(1.15); opacity: 1; box-shadow: 0 0 10px #10b981; }
    100% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 4px #10b981; }
  }

  .pip-logo-text {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #e2e8f0;
  }

  .pip-logo-text span {
    background: linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #818cf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 900;
    margin-left: 2px;
  }

  .pip-count-badge {
    font-size: 9px;
    font-weight: 700;
    padding: 1.5px 7px;
    border-radius: 9999px;
    background: rgba(139, 92, 246, 0.15);
    color: #c084fc;
    border: 1px solid rgba(139, 92, 246, 0.3);
  }

  .pip-dock-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    border-radius: 6px;
    padding: 3px 7px;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pip-dock-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.2);
  }

  .pip-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0;
  }

  .pip-list::-webkit-scrollbar {
    width: 3px;
  }
  .pip-list::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
  }

  .pip-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 10px;
    padding: 7px 9px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  .pip-card.running {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%);
    border-color: rgba(168, 85, 247, 0.35);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }

  .pip-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }

  .pip-meta {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    overflow: hidden;
  }

  .pip-client {
    font-size: 11px;
    font-weight: 800;
    color: #c084fc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pip-sep {
    color: #475569;
    font-size: 9px;
  }

  .pip-type {
    font-size: 11px;
    font-weight: 600;
    color: #e2e8f0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pip-tag {
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.04em;
    padding: 1px 4px;
    border-radius: 3px;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .pip-tag.running {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }

  .pip-tag.paused {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.35);
  }

  .pip-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding-top: 2px;
  }

  .pip-stopwatch {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 0.02em;
    font-variant-numeric: tabular-nums;
    color: #34d399;
    text-shadow: 0 0 10px rgba(52, 211, 153, 0.35);
    line-height: 1;
  }

  .pip-stopwatch.paused {
    color: #94a3b8;
    text-shadow: none;
  }

  .pip-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .pip-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 3px 8px;
    border-radius: 5px;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    outline: none;
    transition: all 0.12s ease;
    user-select: none;
  }

  .pip-btn:active {
    transform: scale(0.96);
  }

  .pip-btn-pause {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.18) 100%);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.45);
  }

  .pip-btn-pause:hover {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(217, 119, 6, 0.28) 100%);
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
  }

  .pip-btn-start {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    color: #ffffff;
    box-shadow: 0 1px 4px rgba(5, 150, 105, 0.4);
  }

  .pip-btn-start:hover {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
  }

  .pip-btn-stop {
    padding: 3px 5px;
    background: rgba(244, 63, 94, 0.12);
    color: #fb7185;
    border: 1px solid rgba(244, 63, 94, 0.25);
    border-radius: 5px;
  }

  .pip-btn-stop:hover {
    background: rgba(244, 63, 94, 0.25);
    color: #fff;
    border-color: rgba(244, 63, 94, 0.5);
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
  const { showToast } = useToast();

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
    // Titlebar chrome ~42px + body padding/header ~46px + count * (card ~60px + gap 6px)
    const calculated = 88 + count * 66;
    return Math.min(460, Math.max(154, calculated));
  }, []);

  // Safely inject styles into PiP window
  const injectStylesIntoWindow = (targetWin: Window) => {
    try {
      // 1. Inject complete, self-contained, bulletproof PiP stylesheet
      const dedicatedStyle = targetWin.document.createElement('style');
      dedicatedStyle.textContent = PIP_EMBEDDED_STYLES;
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
        showToast('No active timer running to float. Start a deliverable timer first!');
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
      showToast('Floating desktop timer focused', 'success');
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
          showToast('Desktop timer popped out (Always on Top)', 'success');
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
          showToast('Floating desktop timer opened', 'success');
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

    const pollInterval = setInterval(() => {
      if (!isLoginPage) {
        refreshTimers();
      }
    }, 2500);

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

  // Ultra-compact render for floating PiP and corner widget
  const renderContent = (isInsidePip: boolean) => {
    if (isInsidePip) {
      if (entries.length === 0) {
        return (
          <div className="pip-container">
            <div className="pip-header">
              <div className="pip-brand">
                <div className="pip-dot paused" />
                <span className="pip-logo-text">DESIGN ORBIT</span>
                <span className="pip-count-badge">Idle</span>
              </div>
              <button
                type="button"
                onClick={closePipWindow}
                className="pip-dock-btn"
                title="Dock to browser window"
              >
                <Minimize2 style={{ width: 10, height: 10 }} />
                <span>Dock</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 10px', textAlign: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>No active timers in PiP</span>
              <span style={{ fontSize: '9px', color: '#64748b' }}>Start a timer on your work log to track</span>
            </div>
          </div>
        );
      }

      return (
        <div className="pip-container">
          {/* Header */}
          <div className="pip-header">
            <div className="pip-brand">
              <div className={`pip-dot ${runningCount === 0 ? 'paused' : ''}`} />
              <span className="pip-logo-text">Design <span>Orbit</span></span>
              <span className="pip-count-badge">
                {runningCount > 0 ? `${runningCount} Active` : 'Paused'}
              </span>
            </div>
            <button
              type="button"
              onClick={closePipWindow}
              className="pip-dock-btn"
              title="Dock to browser window"
            >
              <Minimize2 style={{ width: 10, height: 10 }} />
              <span>Dock</span>
            </button>
          </div>

          {/* List of Tasks */}
          <div className="pip-list">
            {entries.map(entry => {
              const isRunning = Boolean(entry.timer_started_at);
              const elapsed = calculateWorkEntrySeconds(entry, nowMs);
              const stopwatch = formatWorkEntryStopwatch(elapsed);
              const clientName = entry.client?.name || 'Client';
              const workTypeName = entry.work_type?.name || 'Deliverable';
              const isOperating = operatingId === entry.id;

              return (
                <div key={entry.id} className={`pip-card ${isRunning ? 'running' : ''}`}>
                  {/* Top: Client & Deliverable */}
                  <div className="pip-card-header">
                    <div className="pip-meta">
                      <span className="pip-client">{clientName}</span>
                      <span className="pip-sep">&bull;</span>
                      <span className="pip-type">{workTypeName}</span>
                    </div>
                    <span className={`pip-tag ${isRunning ? 'running' : 'paused'}`}>
                      {isRunning ? 'RUN' : 'PAUSED'}
                    </span>
                  </div>

                  {/* Bottom: Live Stopwatch + Action Buttons */}
                  <div className="pip-card-footer">
                    <span className={`pip-stopwatch ${!isRunning ? 'paused' : ''}`}>
                      {stopwatch}
                    </span>

                    <div className="pip-actions">
                      {isRunning ? (
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() => handlePause(entry)}
                          className="pip-btn pip-btn-pause"
                          title="Pause Timer"
                        >
                          <Pause style={{ width: 10, height: 10, fill: 'currentColor' }} />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() => handleResume(entry)}
                          className="pip-btn pip-btn-start"
                          title="Start Timer"
                        >
                          <Play style={{ width: 10, height: 10, fill: 'currentColor' }} />
                          <span>Start</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handleStop(entry)}
                        className="pip-btn pip-btn-stop"
                        title="Stop & Finalize"
                      >
                        <Square style={{ width: 10, height: 10, fill: 'currentColor' }} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // In-page docked corner widget render
    return (
      <div className="bg-[#0B0F1C]/95 text-slate-100 backdrop-blur-xl rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] border border-white/[0.1] p-3 max-w-xs w-full space-y-2.5">
        <div className="flex items-center justify-between gap-1.5 border-b border-white/[0.08] pb-2 shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              {runningCount > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              )}
            </span>
            <div className="flex items-center space-x-1 font-bold text-xs tracking-tight truncate">
              <span className="text-slate-200">Design</span>
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent font-black">Orbit</span>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 shrink-0">
              {runningCount} Active
            </span>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => openPipWindow()}
              className="btn-tactile px-2.5 py-1 text-[10px] font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg transition-all flex items-center space-x-1 cursor-pointer shadow-xs hover:shadow-[0_0_12px_rgba(139,92,246,0.5)]"
              title="Float window outside browser (Picture-in-Picture)"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span>Pop Out</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Task List */}
        {!isMinimized && (
          <div className="space-y-2 overflow-y-auto max-h-[220px] pr-0.5">
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
                  className={`p-2 rounded-xl border transition-all ${
                    isRunning
                      ? 'bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-[#0B0F1C] border-violet-500/35 shadow-[0_0_15px_rgba(139,92,246,0.12)]'
                      : 'bg-white/[0.02] border-white/[0.06] opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center space-x-1.5 truncate min-w-0 font-bold">
                      <Building2 className="w-3 h-3 text-violet-400 shrink-0" />
                      <span className="text-violet-300 font-bold truncate">{clientName}</span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-slate-300 font-medium truncate">{workTypeName}</span>
                    </div>
                    <span
                      className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-md shrink-0 tracking-wide ${
                        isRunning
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isRunning ? 'RUNNING' : 'PAUSED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-white/[0.06]">
                    <div
                      className={`font-mono text-base font-extrabold tracking-tight tabular-nums ${
                        isRunning ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-slate-400'
                      }`}
                    >
                      {stopwatch}
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {isRunning ? (
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() => handlePause(entry)}
                          className="px-2 py-1 text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg transition-all btn-tactile flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                          title="Pause Timer"
                        >
                          <Pause className="w-2.5 h-2.5 fill-current" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() => handleResume(entry)}
                          className="px-2 py-1 text-[10px] font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition-all btn-tactile flex items-center space-x-1 cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)] disabled:opacity-50"
                          title="Resume Timer"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Start</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isOperating}
                        onClick={() => handleStop(entry)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer transition-colors btn-tactile"
                        title="Stop & Finalize Task"
                      >
                        <Square className="w-2.5 h-2.5 fill-current" />
                      </button>
                    </div>
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
      className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {renderContent(false)}
    </aside>
  );
}
