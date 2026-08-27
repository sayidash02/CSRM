import React, { useState } from 'react';
import { ExternalLink, Link2, ChevronDown } from 'lucide-react';
import type { DocumentLink } from './SharepointLinksInput';

interface SharepointLinksBadgeProps {
  links?: DocumentLink[] | null;
  compact?: boolean;
}

export function SharepointLinksBadge({ links, compact = false }: SharepointLinksBadgeProps) {
  const [open, setOpen] = useState(false);

  if (!links || !Array.isArray(links) || links.length === 0) {
    return <span className="text-slate-2/40 text-xs">—</span>;
  }

  const validLinks = links.filter((l) => l && l.url && /^https?:\/\//i.test(l.url.trim()));

  if (validLinks.length === 0) {
    return <span className="text-slate-2/40 text-xs">—</span>;
  }

  if (validLinks.length === 1) {
    const single = validLinks[0];
    return (
      <a
        href={single.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
        title={single.url}
      >
        <Link2 size={11} className="shrink-0" />
        <span className="max-w-[120px] truncate">{single.title || 'SharePoint'}</span>
        <ExternalLink size={10} className="shrink-0 opacity-70" />
      </a>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
      >
        <Link2 size={11} className="shrink-0" />
        <span>{validLinks.length} Tautan</span>
        <ChevronDown size={10} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-56 rounded-md shadow-lg bg-white dark:bg-slate-900 border border-line py-1 z-50 animate-in fade-in-50 zoom-in-95">
            <div className="px-2.5 py-1 text-[10px] font-semibold text-slate uppercase border-b border-line">
              Tautan Dokumen ({validLinks.length})
            </div>
            {validLinks.map((item, idx) => (
              <a
                key={idx}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs text-ink hover:bg-paper-2 transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Link2 size={12} className="text-forest shrink-0" />
                  <span className="truncate font-medium">{item.title || `Tautan ${idx + 1}`}</span>
                </div>
                <ExternalLink size={11} className="shrink-0 text-slate" />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

