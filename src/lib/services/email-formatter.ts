import { WorkEntryWithDetails } from '@/types';

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

// Generate Professional Email Table HTML
export function generateEmailTableHtml(
  entries: WorkEntryWithDetails[],
  designerName: string,
  dateStr: string
): string {
  const formattedDate = formatEmailDate(dateStr);
  const totalQty = entries.reduce((acc, curr) => acc + (curr.quantity_done || 0), 0);
  const uniqueClients = new Set(entries.map(e => e.client?.name || 'General')).size;

  const rows = entries.map((entry, idx) => {
    const client = entry.client?.name || 'General';
    const type = entry.work_type?.name || 'Task';
    const desc = entry.description || 'No description provided';
    const qty = entry.quantity_done;
    const url = entry.project_url || entry.best_work_url;
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

    const linkHtml = url
      ? `<a href="${url}" target="_blank" style="display: inline-block; color: #0284c7; font-weight: 600; text-decoration: underline; font-size: 12px;">View Deliverable &nearr;</a>`
      : `<span style="color: #94a3b8; font-size: 12px;">&mdash;</span>`;

    return `
      <tr style="background-color: ${bg}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; font-size: 13px; color: #64748b; text-align: center; border-right: 1px solid #e2e8f0;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: #0f172a; border-right: 1px solid #e2e8f0;">${client}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #334155; border-right: 1px solid #e2e8f0;">
          <span style="display: inline-block; padding: 2px 8px; background-color: #f1f5f9; border-radius: 4px; font-size: 12px; font-weight: 500;">${type}</span>
        </td>
        <td style="padding: 10px 12px; font-size: 13px; color: #334155; line-height: 1.4; border-right: 1px solid #e2e8f0;">${desc}</td>
        <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #0f172a; text-align: center; border-right: 1px solid #e2e8f0;">${qty}</td>
        <td style="padding: 10px 12px; text-align: center;">${linkHtml}</td>
      </tr>
    `;
  }).join('');

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 780px; color: #1e293b; line-height: 1.5; padding: 12px 0;">
  <!-- Header Card -->
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 18px;">
    <h2 style="margin: 0 0 4px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Daily Work Log &mdash; <span style="color: #0284c7;">${designerName}</span>
    </h2>
    <div style="color: #64748b; font-size: 13px; margin-top: 4px;">
      <strong>Date:</strong> ${formattedDate} &nbsp;|&nbsp; 
      <strong>Total Deliverables:</strong> ${totalQty} items across ${uniqueClients} client(s)
    </div>
  </div>

  <!-- Work Entries Table -->
  <table style="width: 100%; border-collapse: collapse; font-family: inherit; font-size: 13px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
    <thead>
      <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left;">
        <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; width: 40px; border-right: 1px solid #e2e8f0;">#</th>
        <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid #e2e8f0;">Client</th>
        <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid #e2e8f0;">Type</th>
        <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid #e2e8f0;">Description / Scope</th>
        <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; width: 60px; border-right: 1px solid #e2e8f0;">Qty</th>
        <th style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; width: 130px;">Deliverable</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
    <tfoot>
      <tr style="background-color: #f8fafc; border-top: 2px solid #cbd5e1; font-weight: 700;">
        <td colspan="4" style="padding: 10px 12px; font-size: 13px; color: #0f172a; text-align: right; border-right: 1px solid #e2e8f0;">
          Total Deliverables Done:
        </td>
        <td style="padding: 10px 12px; font-size: 14px; color: #0284c7; text-align: center; border-right: 1px solid #e2e8f0;">
          ${totalQty}
        </td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <!-- Email Footer -->
  <div style="color: #94a3b8; font-size: 11px; margin-top: 14px; text-align: right;">
    Generated by Design Orbit &bull; Webtree Online Creative Team
  </div>
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
  const totalQty = entries.reduce((acc, curr) => acc + (curr.quantity_done || 0), 0);

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
    const clientQty = items.reduce((acc, curr) => acc + curr.quantity_done, 0);

    const itemList = items.map(item => {
      const type = item.work_type?.name || 'Task';
      const desc = item.description || '';
      const url = item.project_url || item.best_work_url;
      const linkHtml = url
        ? ` &mdash; <a href="${url}" target="_blank" style="color: #0284c7; font-weight: 600; text-decoration: underline; font-size: 12px;">View Deliverable &nearr;</a>`
        : '';

      return `
        <li style="margin-bottom: 8px; color: #334155; font-size: 13.5px; line-height: 1.5;">
          <strong style="color: #0f172a;">${type}</strong> (Qty: <strong>${item.quantity_done}</strong>): 
          <span>${desc}</span>${linkHtml}
        </li>
      `;
    }).join('');

    return `
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 10px;">
          <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">
            🏢 ${clientName}
          </h4>
          <span style="font-size: 12px; font-weight: 600; color: #0284c7; background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 2px 8px; border-radius: 12px;">
            ${clientQty} item(s)
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
  <!-- Header Card -->
  <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px;">
    <h2 style="margin: 0 0 4px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Daily Work Log &mdash; <span style="color: #0284c7;">${designerName}</span>
    </h2>
    <div style="color: #64748b; font-size: 13px;">
      <strong>Date:</strong> ${formattedDate} &nbsp;|&nbsp; 
      <strong>Total Deliverables:</strong> ${totalQty} items across ${sortedClients.length} client(s)
    </div>
  </div>

  <!-- Client Groups -->
  <div>
    ${clientSections}
  </div>

  <!-- Email Footer -->
  <div style="color: #94a3b8; font-size: 11px; margin-top: 14px; text-align: right;">
    Generated by Design Orbit &bull; Webtree Online Creative Team
  </div>
</div>
  `.trim();
}

// Generate Clean Hierarchical Plain Text
export function generateCleanPlainText(
  entries: WorkEntryWithDetails[],
  designerName: string,
  dateStr: string
): string {
  const formattedDate = formatEmailDate(dateStr);
  const totalQty = entries.reduce((acc, curr) => acc + (curr.quantity_done || 0), 0);

  const clientMap: Record<string, WorkEntryWithDetails[]> = {};
  entries.forEach(e => {
    const cName = e.client?.name || 'General / Internal';
    if (!clientMap[cName]) clientMap[cName] = [];
    clientMap[cName].push(e);
  });

  const sortedClients = Object.keys(clientMap).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  let output = `Daily Work Log — ${designerName}\n`;
  output += `Date: ${formattedDate}\n`;
  output += `Total Deliverables: ${totalQty} items across ${sortedClients.length} client(s)\n`;
  output += `--------------------------------------------------------\n\n`;

  sortedClients.forEach((clientName, cIdx) => {
    const items = clientMap[clientName];
    const clientQty = items.reduce((acc, curr) => acc + curr.quantity_done, 0);

    output += `[${cIdx + 1}] CLIENT: ${clientName} (${clientQty} items)\n`;

    items.forEach((item, iIdx) => {
      const type = item.work_type?.name || 'Task';
      const desc = item.description || '';
      const url = item.project_url || item.best_work_url;

      output += `  • ${type} (Qty: ${item.quantity_done}) - ${desc}\n`;
      if (url) {
        output += `    Project Link: ${url}\n`;
      }
    });
    output += `\n`;
  });

  output += `--------------------------------------------------------\n`;
  output += `Design Orbit | Webtree Creative Team\n`;

  return output;
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
