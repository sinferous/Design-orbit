'use client';

import React from 'react';
import { Snowfall } from './Snowfall';

/** Flat graphite ground with light snowfall. Surfaces separate by tone, not by grids or glows. */
export function CreativeBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 select-none bg-[#0a0a09]" aria-hidden="true">
      <Snowfall />
    </div>
  );
}

export default CreativeBackground;
