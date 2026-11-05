'use client';

import React from 'react';

/** Flat graphite ground. Surfaces separate by tone, not by grids or glows. */
export function CreativeBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 select-none bg-[#0c0c0b]" aria-hidden="true" />
  );
}

export default CreativeBackground;
