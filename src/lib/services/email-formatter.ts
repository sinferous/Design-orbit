import { WorkEntryWithDetails } from '@/types';
import { isInProgressEntry } from './work-entry';

// Format date nicely (e.g. Thursday, Sep 3, 2026)
export function formatEmailDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Format email subject line (e.g. End of day report · Varun · Mon 23 Nov)
export function formatEmailSubject(dateStr: string, designerName?: string): string {
  const name = designerName?.trim();
  const parts = (when: string) => ['End of day report', ...(name ? [name] : []), when].join(' · ');
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) throw new Error('bad date');
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const shortMonth = date.toLocaleDateString('en-US', { month: 'short' });
    return parts(`${weekday} ${date.getDate()} ${shortMonth}`);
  } catch {
    return parts(dateStr);
  }
}

// Escape text from entries before it goes into the email HTML
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Generate the day log email: a plain work email with one calm table
export function generateEmailTableHtml(
  entries: WorkEntryWithDetails[],
  designerName: string,
  dateStr: string
): string {
  const formattedDate = formatEmailDate(dateStr);
  const totalCompletedQty = entries
    .filter(e => !isInProgressEntry(e) && (e.quantity_done || 0) > 0)
    .reduce((acc, curr) => acc + (curr.quantity_done || 0), 0);
  const totalWorkingCount = entries
    .filter(e => isInProgressEntry(e) || (e.quantity_done || 0) === 0)
    .length;
  const uniqueClients = new Set(entries.map(e => e.client?.name || 'General')).size;
  const safeName = esc(designerName?.trim() || 'Team Member');
  const hasLinks = entries.some(e => e.project_url || e.best_work_url);

  const ink = '#1f2328';
  const muted = '#6b7280';
  const line = '#e5e7eb';
  const green = '#1d7f56';
  const amber = '#b45309';
  const cell = `padding: 10px 12px; font-size: 14px; color: ${ink}; border-bottom: 1px solid ${line}; vertical-align: top;`;
  const head = `padding: 8px 12px; font-size: 12px; font-weight: 600; color: ${muted}; text-align: left; border-bottom: 1px solid ${line};`;

  const rows = entries.map((entry, idx) => {
    const client = esc(entry.client?.name || 'General');
    const type = esc(entry.work_type?.name || 'Task');
    const desc = esc(entry.description || 'No description');
    const isWorking = isInProgressEntry(entry) || (entry.quantity_done || 0) === 0;
    const url = entry.project_url || entry.best_work_url;

    const qty = isWorking
      ? `<span style="font-size: 13px; color: ${amber};">In progress</span>`
      : `${entry.quantity_done}`;
    const link = url
      ? `<a href="${esc(url)}" target="_blank" style="color: ${green}; text-decoration: underline;">Open</a>`
      : '';

    return `
      <tr>
        <td style="${cell} color: ${muted}; width: 28px;">${idx + 1}</td>
        <td style="${cell} font-weight: 600;">${client}</td>
        <td style="${cell} color: ${muted};">${type}</td>
        <td style="${cell} line-height: 1.45;">${desc}</td>
        <td style="${cell} text-align: right; white-space: nowrap;">${qty}</td>
        ${hasLinks ? `<td style="${cell} white-space: nowrap;">${link}</td>` : ''}
      </tr>`;
  }).join('');

  const summary = [
    `${totalCompletedQty} ${totalCompletedQty === 1 ? 'deliverable' : 'deliverables'}`,
    `${uniqueClients} ${uniqueClients === 1 ? 'client' : 'clients'}`,
    ...(totalWorkingCount > 0 ? [`${totalWorkingCount} in progress`] : []),
  ].join(' &middot; ');

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 760px; color: ${ink}; font-size: 14px; line-height: 1.55;">
  <p style="margin: 0 0 20px 0;">Hi,<br>Please find today&#39;s report</p>

  <p style="margin: 0 0 2px 0; font-size: 16px; font-weight: 600; color: ${ink};">Work log, ${formattedDate}</p>
  <p style="margin: 0 0 16px 0; font-size: 13px; color: ${muted};">${summary}</p>

  <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-family: inherit;">
    <thead>
      <tr>
        <th style="${head}">#</th>
        <th style="${head}">Client</th>
        <th style="${head}">Type</th>
        <th style="${head}">Task</th>
        <th style="${head} text-align: right;">Qty</th>
        ${hasLinks ? `<th style="${head}">Link</th>` : ''}
      </tr>
    </thead>
    <tbody>${rows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4" style="padding: 10px 12px; font-size: 14px; font-weight: 600; color: ${ink}; text-align: right;">Total</td>
        <td style="padding: 10px 12px; font-size: 14px; font-weight: 600; color: ${green}; text-align: right;">${totalCompletedQty}</td>
        ${hasLinks ? '<td></td>' : ''}
      </tr>
    </tfoot>
  </table>

  <p style="margin: 24px 0 0 0;">Regards,<br>${safeName}</p>
</div>
  `.trim();
}

// Generate Client-Grouped Digest HTML
export function generateGroupedEmailHtml(
  entries: WorkEntryWithDetails[],
  designerName: string,
  dateStr: string
): string {
  const formattedDate = formatEmailDate(dateStr);
  const totalCompletedQty = entries
    .filter(e => !isInProgressEntry(e) && (e.quantity_done || 0) > 0)
    .reduce((acc, curr) => acc + (curr.quantity_done || 0), 0);
  const totalWorkingCount = entries
    .filter(e => isInProgressEntry(e) || (e.quantity_done || 0) === 0)
    .length;
  const safeName = designerName?.trim() || 'Team Member';

  // Group by client
  const clientMap: Record<string, WorkEntryWithDetails[]> = {};
  entries.forEach(e => {
    const cName = e.client?.name || 'General / Internal';
    if (!clientMap[cName]) clientMap[cName] = [];
    clientMap[cName].push(e);
  });

  const sortedClients = Object.keys(clientMap).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  const clientSections = sortedClients.map(clientName => {
    const items = clientMap[clientName];
    const completedItems = items.filter(i => !isInProgressEntry(i) && (i.quantity_done || 0) > 0);
    const workingItems = items.filter(i => isInProgressEntry(i) || (i.quantity_done || 0) === 0);
    const clientQty = completedItems.reduce((acc, curr) => acc + curr.quantity_done, 0);

    const itemList = items.map(item => {
      const type = item.work_type?.name || 'Task';
      const desc = item.description || '';
      const url = item.project_url || item.best_work_url;
      const isWorking = isInProgressEntry(item) || (item.quantity_done || 0) === 0;
      const linkHtml = url
        ? ` &mdash; <a href="${url}" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline; font-size: 12px;">View Deliverable &nearr;</a>`
        : '';
      const statusBadge = isWorking
        ? `<span style="display: inline-block; padding: 1px 7px; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase;">Working</span>`
        : `(Qty: <strong>${item.quantity_done}</strong>)`;

      return `
        <li style="margin-bottom: 8px; color: #334155; font-size: 13.5px; line-height: 1.5;">
          <strong style="color: #0f172a;">${type}</strong> ${statusBadge}: 
          <span>${desc}</span>${linkHtml}
        </li>
      `;
    }).join('');

    const badgeText = clientQty > 0
      ? `${clientQty} deliverable(s)${workingItems.length > 0 ? ` + ${workingItems.length} working` : ''}`
      : `${workingItems.length} in progress`;

    return `
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px;">
          <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">
            🏢 ${clientName}
          </h4>
          <span style="font-size: 12px; font-weight: 600; color: #0284c7; background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 12px;">
            ${badgeText}
          </span>
        </div>
        <ul style="margin: 0; padding-left: 20px;">
          ${itemList}
        </ul>
      </div>
    `;
  }).join('');

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 720px; color: #1e293b; line-height: 1.5; padding: 12px 0;">
  <!-- Greeting -->
  <div style="margin-bottom: 18px; font-size: 14px; color: #1e293b; line-height: 1.6;">
    Hi,<br>
    Please find today&apos;s report
  </div>

  <!-- Header Card -->
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px;">
    <h2 style="margin: 0 0 4px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Daily Work Log &mdash; <span style="color: #0284c7;">${safeName}</span>
    </h2>
    <div style="color: #64748b; font-size: 13px;">
      <strong>Date:</strong> ${formattedDate} &nbsp;|&nbsp; 
      <strong>Total Deliverables:</strong> ${totalCompletedQty} items${totalWorkingCount > 0 ? ` (+${totalWorkingCount} working)` : ''} across ${sortedClients.length} client(s)
    </div>
  </div>

  <!-- Client Groups -->
  <div>
    ${clientSections}
  </div>

  <!-- Sign-off -->
  <div style="margin-top: 22px; margin-bottom: 14px; font-size: 14px; color: #1e293b; line-height: 1.6;">
    Regards,<br>
    ${safeName}
  </div>

  <!-- Email Footer -->
  <div style="color: #94a3b8; font-size: 11px; margin-top: 14px; text-align: right;">
    Generated by Design Orbit &bull; Webtree Online Creative Team
  </div>
</div>
  `.trim();
}

// Generate the day log as plain text, for chat apps and plain-text mail
export function generateCleanPlainText(
  entries: WorkEntryWithDetails[],
  designerName: string,
  dateStr: string
): string {
  const formattedDate = formatEmailDate(dateStr);
  const isWorking = (e: WorkEntryWithDetails) => isInProgressEntry(e) || (e.quantity_done || 0) === 0;
  const totalCompletedQty = entries
    .filter(e => !isWorking(e))
    .reduce((acc, curr) => acc + (curr.quantity_done || 0), 0);
  const totalWorkingCount = entries.filter(isWorking).length;

  const clientMap: Record<string, WorkEntryWithDetails[]> = {};
  entries.forEach(e => {
    const cName = e.client?.name || 'General';
    if (!clientMap[cName]) clientMap[cName] = [];
    clientMap[cName].push(e);
  });
  const sortedClients = Object.keys(clientMap).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  const safeName = designerName?.trim() || 'Team Member';
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const summary = [
    plural(totalCompletedQty, 'deliverable', 'deliverables'),
    plural(sortedClients.length, 'client', 'clients'),
    ...(totalWorkingCount > 0 ? [`${totalWorkingCount} in progress`] : []),
  ].join(' · ');

  const lines: string[] = [
    'Hi,',
    "Please find today's report",
    '',
    `Work log, ${formattedDate}`,
    summary,
  ];

  sortedClients.forEach(clientName => {
    lines.push('', clientName);
    clientMap[clientName].forEach(item => {
      const type = item.work_type?.name || 'Task';
      const desc = item.description?.trim() || 'No description';
      const qty = isWorking(item) ? 'in progress' : `${item.quantity_done}`;
      lines.push(`- ${desc} (${type}, ${qty})`);
      const url = item.project_url || item.best_work_url;
      if (url) lines.push(`  ${url}`);
    });
  });

  lines.push('', `Total: ${totalCompletedQty}`, '', 'Regards,', safeName);
  return lines.join('\n');
}

// Copy both Rich HTML and Plain Text simultaneously into clipboard
export async function copyToClipboardWithHtml(html: string, plain: string): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
      const htmlBlob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([plain], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      await navigator.clipboard.write([item]);
      return true;
    }
    await navigator.clipboard.writeText(plain);
    return true;
  } catch (err) {
    console.warn('Rich clipboard copy failed, falling back to text copy:', err);
    try {
      await navigator.clipboard.writeText(plain);
      return true;
    } catch {
      return false;
    }
  }
}
