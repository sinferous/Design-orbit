'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { WorkEntryWithDetails } from '@/types';
import {
  getActiveRunningWorkEntries,
  startWorkEntryTimer,
  stopWorkEntryTimer,
  calculateWorkEntrySeconds,
  formatWorkEntryStopwatch,
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
    background: #090d16;
  }

  body {
    background: radial-gradient(circle at 50% 0%, #151d30 0%, #090d16 100%);
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Inter", Helvetica, Arial, sans-serif;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    padding: 7px 9px 8px;
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
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .pip-count-badge {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 9999px;
    background: rgba(56, 189, 248, 0.12);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.25);
  }

  .pip-dock-btn {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
    border-radius: 5px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .pip-dock-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.25);
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
    background: rgba(255, 255, 255, 0.035);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 8px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  .pip-card.running {
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%);
    border-color: rgba(56, 189, 248, 0.3);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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
    gap: 4px;
    min-width: 0;
    overflow: hidden;
  }

  .pip-client {
    font-size: 11px;
    font-weight: 800;
    color: #38bdf8;
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
    font-family: "SF Mono", "Roboto Mono", "JetBrains Mono", Menlo, Consolas, monospace;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: 0.03em;
    color: #fbbf24;
    text-shadow: 0 0 8px rgba(251, 191, 36, 0.35);
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
  const [entries, setEntries] = useState<WorkEntryWithDetails[]>([]);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [operatingId, setOperatingId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const { showToast } = useToast();

  const pipContainerRef = useRef<HTMLDivElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);
  pipWindowRef.current = pipWindow;

  const closePipWindow = useCallback(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
    }
    setPipWindow(null);
    pipWindowRef.current = null;
    pipContainerRef.current = null;
  }, []);

  // Sync active and recently running timers from storage / database
  const refreshTimers = useCallback(async () => {
    try {
      const active = await getActiveRunningWorkEntries();
      setEntries(prev => {
        const activeIds = new Set(active.map(a => a.id));

        // Keep items from prev ONLY if they were explicitly paused inside PiP (timer_started_at is falsy)
        // If an item in prev was running but is no longer in active, it was stopped on the website or DB -> MUST be removed!
        const pausedInPip = prev.filter(p => !p.timer_started_at && !activeIds.has(p.id));

        const next = [...active, ...pausedInPip];

        if (next.length === 0 && pipWindowRef.current && !pipWindowRef.current.closed) {
          closePipWindow();
        }

        return next;
      });
    } catch (err) {
      console.warn('FloatingPipTimer refresh error:', err);
    }
  }, [closePipWindow]);

  // Precise dynamic height calculation matching the compact styling and OS window frame
  const computeTargetHeight = (taskCount: number) => {
    const count = Math.max(1, taskCount);
    // Titlebar chrome ~42px + body padding/header ~46px + count * (card ~60px + gap 6px)
    const calculated = 88 + count * 66;
    return Math.min(460, Math.max(154, calculated));
  };

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

      targetWin.document.title = 'Design Orbit';
    } catch (err) {
      console.warn('Could not inject styles into PiP window:', err);
    }
  };

  // Open Document Picture-in-Picture window or popup fallback
  const openPipWindow = useCallback(async (initialEntry?: WorkEntryWithDetails): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    if (initialEntry) {
      setEntries(prev => {
        const exists = prev.some(item => item.id === initialEntry.id);
        if (exists) {
          return prev.map(item => (item.id === initialEntry.id ? { ...item, ...initialEntry } : item));
        }
        return [initialEntry, ...prev];
      });
    }

    const count = Math.max(1, entries.length, initialEntry ? 1 : 0);
    const targetHeight = computeTargetHeight(count);
    const targetWidth = 320;

    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus();
      try {
        pipWindowRef.current.resizeTo(targetWidth, targetHeight);
      } catch (e) {}
      return true;
    }

    // Try Document Picture-in-Picture API first (Chrome 116+, Edge 116+)
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

        pip.addEventListener('pagehide', () => {
          setPipWindow(null);
          pipWindowRef.current = null;
          pipContainerRef.current = null;
        });

        pipContainerRef.current = container;
        setPipWindow(pip);
        pipWindowRef.current = pip;
        return true;
      } catch (pipErr: any) {
        console.warn('Document Picture-in-Picture request rejected or failed:', pipErr);
      }
    }

    // Fallback: lightweight popup window
    try {
      const left = Math.max(0, window.screen.availWidth - targetWidth - 20);
      const top = Math.max(0, window.screen.availHeight - targetHeight - 40);
      const popup = window.open(
        '',
        'design_orbit_floating_timer',
        `width=${targetWidth},height=${targetHeight},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
      );

      if (popup) {
        injectStylesIntoWindow(popup);
        const container = popup.document.createElement('div');
        container.id = 'pip-portal-root';
        popup.document.body.appendChild(container);

        popup.addEventListener('pagehide', () => {
          setPipWindow(null);
          pipWindowRef.current = null;
          pipContainerRef.current = null;
        });

        pipContainerRef.current = container;
        setPipWindow(popup);
        pipWindowRef.current = popup;
        return true;
      }
    } catch (popupErr: any) {
      console.warn('Popup window fallback failed:', popupErr);
    }

    return false;
  }, [entries.length]);

  // Dynamically adjust PiP window size as tasks change
  useEffect(() => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      const targetHeight = computeTargetHeight(entries.length);
      try {
        pipWindowRef.current.resizeTo(320, targetHeight);
      } catch (e) {}
    }
  }, [entries.length, pipWindow]);

  // Expose manager globally to window
  useEffect(() => {
    window.designOrbitPipManager = {
      openPip: openPipWindow,
      closePip: closePipWindow,
      isPipOpen: () => Boolean(pipWindowRef.current && !pipWindowRef.current.closed),
    };

    return () => {
      delete window.designOrbitPipManager;
    };
  }, [openPipWindow, closePipWindow]);

  // Sync timers on timer events and auto-open PiP when leaving the page
  useEffect(() => {
    refreshTimers();

    const handleTimerAction = (detail: any) => {
      const { id, entry, action } = detail || {};
      if (!id) {
        refreshTimers();
        return;
      }

      if (action === 'stop') {
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
      if (document.visibilityState === 'hidden') {
        const hasActive = entries.some(e => Boolean(e.timer_started_at));
        if (hasActive && (!pipWindowRef.current || pipWindowRef.current.closed)) {
          openPipWindow().catch(() => {});
        }
      }
    };

    const handleWindowBlur = () => {
      const hasActive = entries.some(e => Boolean(e.timer_started_at));
      if (hasActive && (!pipWindowRef.current || pipWindowRef.current.closed)) {
        openPipWindow().catch(() => {});
      }
    };

    window.addEventListener('design_orbit_timer_event', handleCustomEvent);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    const pollInterval = setInterval(refreshTimers, 2500);

    return () => {
      window.removeEventListener('design_orbit_timer_event', handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      if (channel) {
        try {
          channel.close();
        } catch (e) {}
      }
      clearInterval(pollInterval);
    };
  }, [refreshTimers, entries, openPipWindow, closePipWindow]);

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
      const updated = await stopWorkEntryTimer(entry.id, entry, undefined, 'pause');
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
      const updated = await startWorkEntryTimer(entry.id, entries);
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
        await stopWorkEntryTimer(entry.id, entry, undefined, 'stop');
      }
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      showToast(`Finalized: ${entry.client?.name || 'Deliverable'}`, 'success');

      if (entries.length <= 1) {
        closePipWindow();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to stop timer', 'error');
    } finally {
      setOperatingId(null);
    }
  };

  if (entries.length === 0) {
    return null;
  }

  const runningCount = entries.filter(e => Boolean(e.timer_started_at)).length;

  // Ultra-compact render for floating PiP and corner widget
  const renderContent = (isInsidePip: boolean) => {
    if (isInsidePip) {
      return (
        <div className="pip-container">
          {/* Header */}
          <div className="pip-header">
            <div className="pip-brand">
              <div className={`pip-dot ${runningCount === 0 ? 'paused' : ''}`} />
              <span className="pip-logo-text">DESIGN ORBIT</span>
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
      <div className="bg-slate-950/95 text-slate-100 backdrop-blur-md rounded-xl shadow-2xl border border-slate-800 p-3 max-w-xs w-full space-y-2">
        <div className="flex items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1.5 shrink-0">
          <div className="flex items-center space-x-1.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              {runningCount > 0 ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              )}
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-200 truncate">
              Design Orbit
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
              {runningCount} Active
            </span>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => openPipWindow()}
              className="px-2 py-0.5 text-[10px] font-bold bg-sky-600 hover:bg-sky-500 text-white rounded transition-colors flex items-center space-x-1 cursor-pointer"
              title="Float window outside browser (Picture-in-Picture)"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              <span>Pop Out</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Task List */}
        {!isMinimized && (
          <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-0.5">
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
                  className={`p-1.5 rounded-lg border transition-all ${
                    isRunning
                      ? 'bg-slate-900/90 border-slate-700 shadow-2xs'
                      : 'bg-slate-900/40 border-slate-800/60 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <div className="flex items-center space-x-1 truncate min-w-0 font-bold">
                      <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
                      <span className="text-sky-400 truncate">{clientName}</span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-slate-300 font-semibold truncate">{workTypeName}</span>
                    </div>
                    <span
                      className={`text-[8px] font-extrabold uppercase px-1 py-0.2 rounded shrink-0 ${
                        isRunning
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/80'
                      }`}
                    >
                      {isRunning ? 'RUN' : 'PAUSED'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1 pt-0.5 border-t border-slate-800/50">
                    <div
                      className={`font-mono text-base font-black tracking-tight ${
                        isRunning ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {stopwatch}
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {isRunning ? (
                        <button
                          type="button"
                          disabled={isOperating}
                          onClick={() => handlePause(entry)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded transition-all flex items-center space-x-0.5 cursor-pointer disabled:opacity-50"
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
                          className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-all flex items-center space-x-0.5 cursor-pointer shadow-xs disabled:opacity-50"
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
                        className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer transition-colors"
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

  // Otherwise, render docked in-page floating widget pinned to bottom right corner
  return (
    <aside
      aria-label="Live Floating Timers"
      className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {renderContent(false)}
    </aside>
  );
}
