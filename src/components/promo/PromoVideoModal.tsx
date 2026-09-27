'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  X,
  Sparkles,
  Film,
} from 'lucide-react';

export function PromoVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [centerRipple, setCenterRipple] = useState<'play' | 'pause' | null>(null);
  const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rippleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Format seconds into MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-hide controls logic during playback
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 2600);
    }
  }, [isPlaying]);

  // Handle Play / Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        triggerRipple('play');
      }).catch(err => {
        console.warn('Playback prevented:', err);
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerRipple('pause');
    }
  }, []);

  // Visual ripple when clicking the video directly
  const triggerRipple = (type: 'play' | 'pause') => {
    setCenterRipple(type);
    if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current);
    rippleTimerRef.current = setTimeout(() => {
      setCenterRipple(null);
    }, 600);
  };

  // Open modal and attempt to auto-play video
  const handleOpenModal = () => {
    setIsOpen(true);
    setShowControls(true);
  };

  // Close modal and pause video immediately
  const handleCloseModal = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    setIsOpen(false);
    setShowSpeedMenu(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // When modal opens, start playback
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay with sound might need muted start in some browser policies
            setIsPlaying(false);
          });
      }
    }
  }, [isOpen]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current || isDraggingTimeline) return;
    setCurrentTime(videoRef.current.currentTime);

    // Update buffered progress
    if (videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const total = videoRef.current.duration || 1;
      setBuffered(Math.min(1, bufferedEnd / total));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  // Seek bar scrubber logic
  const handleSeek = (clientX: number) => {
    if (!timelineRef.current || !videoRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = pos * (duration || 0);
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    setIsDraggingTimeline(true);
    handleSeek(e.clientX);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      handleSeek(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      setIsDraggingTimeline(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTimelineHover = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * (duration || 0));
  };

  // Jump by delta seconds (e.g. -10s or +10s)
  const jumpSeconds = (delta: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    resetControlsTimer();
  };

  // Volume & Mute control
  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      if (volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
      }
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
    resetControlsTimer();
  };

  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolume(clamped);
    videoRef.current.volume = clamped;
    if (clamped === 0) {
      setIsMuted(true);
      videoRef.current.muted = true;
    } else {
      setIsMuted(false);
      videoRef.current.muted = false;
    }
    resetControlsTimer();
  };

  // Playback speed
  const changeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    resetControlsTimer();
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'arrowleft':
          e.preventDefault();
          jumpSeconds(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          jumpSeconds(5);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'escape':
          e.preventDefault();
          handleCloseModal();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, togglePlay, handleCloseModal, volume, isMuted, duration]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* ========================================================================= */}
      {/* FLOATING TRIGGER BUTTON (Bottom Right - Same theme as Design Orbit)      */}
      {/* ========================================================================= */}
      <div
        className="fixed bottom-6 right-6 z-40 print:hidden select-none"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Hover Pill Tooltip */}
        <div
          className={`absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-xl bg-[#0B0F1C]/95 border border-violet-500/30 text-white shadow-[0_8px_30px_rgba(0,0,0,0.7)] backdrop-blur-xl whitespace-nowrap transition-all duration-300 pointer-events-none ${
            showTooltip
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-2'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
            </span>
            <span className="font-extrabold text-xs tracking-tight bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-200 bg-clip-text text-transparent">
              Design Orbit Promo
            </span>
            <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.06] px-1.5 py-0.5 rounded-md border border-white/[0.08]">
              Play
            </span>
          </div>
        </div>

        {/* The Orbiting Trigger Button */}
        <button
          type="button"
          onClick={handleOpenModal}
          aria-label="Play Design Orbit Promo Video"
          className="group relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 active:scale-95"
        >
          {/* Ambient Glowing Halo Backdrop */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-600/40 via-fuchsia-600/30 to-indigo-600/40 blur-lg group-hover:blur-xl transition-all duration-500 opacity-70 group-hover:opacity-100 group-hover:scale-125" />

          {/* SVG DOTTED SPINNING ORBIT RING 1 (Clockwise) */}
          <svg
            className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none animate-spin-slow group-hover:[animation-duration:10s]"
            style={{ animationDuration: '18s' }}
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#orbitGradient1)"
              strokeWidth="2.5"
              strokeDasharray="4 6"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="orbitGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#818cf8" />
              </linearGradient>
            </defs>
          </svg>

          {/* SVG DOTTED REVERSE ORBIT RING 2 (Counter-clockwise subtle outer dots) */}
          <svg
            className="absolute -inset-3.5 w-[calc(100%+28px)] h-[calc(100%+28px)] pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity duration-300"
            style={{ animation: 'spinSlow 32s linear infinite reverse' }}
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="url(#orbitGradient2)"
              strokeWidth="1.5"
              strokeDasharray="2 10"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="orbitGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Orbiting Satellite Star Bead */}
          <div
            className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] pointer-events-none"
            style={{ animation: 'spinSlow 8s linear infinite' }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-fuchsia-300 shadow-[0_0_8px_#ec4899] group-hover:scale-125 transition-transform" />
          </div>

          {/* Glassmorphic Inner Button Body */}
          <div className="relative w-full h-full rounded-full bg-[#080C19]/90 border border-violet-500/40 backdrop-blur-xl flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.6)] group-hover:border-violet-400 group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all duration-300">
            {/* Play Icon with Gradient & Subtle Offset for Visual Centering */}
            <div className="translate-x-0.5 flex items-center justify-center">
              <Play className="w-5 h-5 text-violet-300 fill-violet-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.8)] group-hover:text-white group-hover:fill-fuchsia-400 transition-all duration-300" />
            </div>
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* POP-UP CENTER VIDEO PLAYER MODAL                                         */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 animate-in fade-in duration-200"
        >
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-[#030611]/85 backdrop-blur-xl transition-opacity cursor-pointer"
            onClick={handleCloseModal}
          />

          {/* Modal Container */}
          <div
            ref={playerContainerRef}
            onMouseMove={resetControlsTimer}
            onMouseEnter={() => setShowControls(true)}
            className="relative z-10 w-full max-w-5xl rounded-2xl overflow-hidden bg-[#070A14] border border-violet-500/35 shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(139,92,246,0.25)] flex flex-col transition-all duration-300 animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#0B0F1E]/95 border-b border-white/[0.08] backdrop-blur-md shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 p-[1px] flex items-center justify-center shadow-[0_0_12px_rgba(168,85,247,0.4)]">
                  <div className="w-full h-full bg-[#080C19] rounded-[11px] flex items-center justify-center">
                    <Film className="w-4 h-4 text-violet-300" />
                  </div>
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center space-x-1">
                      <span>Design</span>
                      <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-300 bg-clip-text text-transparent font-black">
                        Orbit
                      </span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                      Master Promo
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                    Interactive Creative Workspace & Deliverable Acceleration Platform
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-500 font-mono hidden sm:inline-block bg-white/[0.04] px-2 py-1 rounded-md border border-white/[0.06]">
                  ESC to close
                </span>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  aria-label="Close Promo Video"
                  className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white bg-white/[0.04] hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/[0.08] transition-all cursor-pointer focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Viewport Area */}
            <div
              className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none group"
              onClick={togglePlay}
              onDoubleClick={toggleFullscreen}
            >
              {/* HTML5 Video Element */}
              <video
                ref={videoRef}
                playsInline
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => {
                  setIsBuffering(false);
                  setIsPlaying(true);
                }}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  setShowControls(true);
                }}
                className="w-full h-full object-contain"
              >
                <source src="/videos/Design_Orbit_Master_Promo.mp4" type="video/mp4" />
                <source src="/Design_Orbit_Master_Promo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>

              {/* Buffering Loading Spinner */}
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs pointer-events-none">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-violet-300 animate-pulse" />
                  </div>
                </div>
              )}

              {/* Big Center Play Button Overlay (when paused) */}
              {!isPlaying && !isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px] transition-all pointer-events-none">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-violet-600/90 to-fuchsia-600/90 p-[2px] shadow-[0_0_40px_rgba(168,85,247,0.6)] animate-in zoom-in-75 duration-200">
                    <div className="w-full h-full rounded-full bg-[#080C19]/80 backdrop-blur-md flex items-center justify-center">
                      <Play className="w-9 h-9 text-white fill-white translate-x-1" />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Center Ripple Feedback (on click) */}
              {centerRipple && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center animate-ping duration-500">
                    {centerRipple === 'play' ? (
                      <Play className="w-8 h-8 text-white fill-white translate-x-0.5" />
                    ) : (
                      <Pause className="w-8 h-8 text-white fill-white" />
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* VIDEO CONTROLS BAR (Auto-hides during playback)                   */}
              {/* ================================================================= */}
              <div
                onClick={e => e.stopPropagation()}
                className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#050814]/95 via-[#050814]/75 to-transparent px-4 sm:px-6 pt-10 pb-4 transition-all duration-300 ${
                  showControls || !isPlaying
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-3 pointer-events-none'
                }`}
              >
                {/* 1. Interactive Seek Bar / Timeline */}
                <div
                  ref={timelineRef}
                  onMouseDown={handleTimelineMouseDown}
                  onMouseMove={handleTimelineHover}
                  onMouseEnter={() => setIsHoveringTimeline(true)}
                  onMouseLeave={() => setIsHoveringTimeline(false)}
                  className="relative group/timeline h-3 flex items-center cursor-pointer mb-3 select-none"
                >
                  {/* Hover Timestamp Bubble */}
                  {isHoveringTimeline && (
                    <div
                      className="absolute -top-8 px-2 py-1 bg-[#0E1428] border border-violet-500/40 text-[11px] font-mono font-bold text-violet-200 rounded-md shadow-lg pointer-events-none -translate-x-1/2"
                      style={{ left: `${hoverPosition}%` }}
                    >
                      {formatTime(hoverTime)}
                    </div>
                  )}

                  {/* Track Background */}
                  <div className="relative w-full h-1.5 group-hover/timeline:h-2.5 rounded-full bg-white/[0.15] overflow-hidden transition-all duration-150">
                    {/* Buffered Progress */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-white/[0.25] transition-all duration-200"
                      style={{ width: `${buffered * 100}%` }}
                    />
                    {/* Played Progress Gradient */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-400 shadow-[0_0_10px_rgba(168,85,247,0.7)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Scrubber Knob */}
                  <div
                    className="absolute w-3.5 h-3.5 group-hover/timeline:w-4 group-hover/timeline:h-4 -ml-2 rounded-full bg-white border-2 border-violet-500 shadow-[0_0_10px_rgba(168,85,247,1)] transition-transform duration-100 scale-0 group-hover/timeline:scale-100 pointer-events-none"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>

                {/* 2. Controls Toolbar Buttons */}
                <div className="flex items-center justify-between text-slate-200">
                  {/* Left Controls: Play/Pause, Skips, Volume, Time */}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* Play/Pause Button */}
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      className="p-2 rounded-lg text-white hover:text-violet-300 hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current translate-x-0.5" />
                      )}
                    </button>

                    {/* -10s Rewind */}
                    <button
                      type="button"
                      onClick={() => jumpSeconds(-10)}
                      title="Rewind 10 seconds"
                      className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer relative"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black pt-1">
                        10
                      </span>
                    </button>

                    {/* +10s Forward */}
                    <button
                      type="button"
                      onClick={() => jumpSeconds(10)}
                      title="Forward 10 seconds"
                      className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer relative"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span className="absolute inset-0 flex items-center justify-center text-[7px] font-black pt-1">
                        10
                      </span>
                    </button>

                    {/* Volume & Mute Section */}
                    <div className="flex items-center space-x-1 group/volume">
                      <button
                        type="button"
                        onClick={toggleMute}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                        className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-5 h-5 text-rose-400" />
                        ) : volume > 0.5 ? (
                          <Volume2 className="w-5 h-5" />
                        ) : (
                          <Volume1 className="w-5 h-5" />
                        )}
                      </button>

                      {/* Smooth Volume Slider */}
                      <div className="w-14 sm:w-20 hidden group-hover/volume:flex items-center pr-2 transition-all">
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                          className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-violet-400"
                        />
                      </div>
                    </div>

                    {/* Time Counter */}
                    <div className="text-xs sm:text-sm font-mono text-slate-300 font-semibold tracking-tight pl-1">
                      <span>{formatTime(currentTime)}</span>
                      <span className="text-slate-500 mx-1.5">/</span>
                      <span className="text-slate-400">{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Right Controls: Speed, Fullscreen */}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* Playback Speed Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="px-2 py-1 text-xs font-bold rounded-lg text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition-colors cursor-pointer border border-white/[0.08]"
                      >
                        {playbackSpeed}x
                      </button>

                      {showSpeedMenu && (
                        <div className="absolute bottom-full right-0 mb-2 py-1 rounded-xl bg-[#0C1020] border border-violet-500/30 shadow-2xl backdrop-blur-xl flex flex-col z-20 min-w-[70px]">
                          {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                            <button
                              key={speed}
                              type="button"
                              onClick={() => changeSpeed(speed)}
                              className={`px-3 py-1 text-xs text-left hover:bg-violet-600/20 transition-colors ${
                                playbackSpeed === speed
                                  ? 'text-violet-300 font-bold bg-violet-500/10'
                                  : 'text-slate-300'
                              }`}
                            >
                              {speed}x
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fullscreen Button */}
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                      className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      {isFullscreen ? (
                        <Minimize className="w-5 h-5" />
                      ) : (
                        <Maximize className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
