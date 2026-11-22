/**
 * Working week per person. Days use Date.getDay(): 0 Sunday .. 6 Saturday.
 *
 * The Bahrain team has Friday and Saturday off and starts the week on Sunday.
 * Everyone else follows the India office.
 */

const BAHRAIN_TEAM = new Set([
  'sams@webtreeonline.com',
  'moveena@webtreeonline.com',
  'fazil@webtreeonline.com',
]);

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface Workweek {
  /** Days not counted as working days (monthly consistency) */
  daysOff: number[];
  /** Days the greeting treats as the weekend */
  weekend: number[];
  firstWorkday: number;
  lastWorkday: number;
  firstWorkdayName: string;
  lastWorkdayName: string;
}

export function isBahrainTeam(email?: string | null): boolean {
  return BAHRAIN_TEAM.has((email || '').trim().toLowerCase());
}

export function workweekFor(email?: string | null): Workweek {
  const ww = isBahrainTeam(email)
    ? { daysOff: [5, 6], weekend: [5, 6], firstWorkday: 0, lastWorkday: 4 }
    : { daysOff: [0], weekend: [0, 6], firstWorkday: 1, lastWorkday: 5 };
  return {
    ...ww,
    firstWorkdayName: DAY_NAMES[ww.firstWorkday],
    lastWorkdayName: DAY_NAMES[ww.lastWorkday],
  };
}
