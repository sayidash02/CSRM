import React from 'react';
import { Plus, Trash2, ExternalLink, Link2 } from 'lucide-react';

export interface DocumentLink {
  title?: string;
  url: string;
}

export const MAX_SHAREPOINT_LINKS = 5;

interface SharepointLinksInputProps {
  value?: DocumentLink[] | null;
  onChange: (links: DocumentLink[]) => void;
  label?: string;
  maxLinks?: number;
}

export function SharepointLinksInput({
  value = [],
  onChange,
  label = 'Tautan Dokumen / SharePoint',
  maxLinks = MAX_SHAREPOINT_LINKS,
}: SharepointLinksInputProps) {
  const links: DocumentLink[] = Array.isArray(value) ? value : [];

  const handleAdd = () => {
    if (links.length >= maxLinks) return;
    onChange([...links, { title: '', url: '' }]);
  };

  const handleRemove = (index: number) => {
    const next = links.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleChange = (index: number, field: 'title' | 'url', val: string) => {
    const next = links.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: val };
    });
    onChange(next);
  };

  return (
    <div className="space-y-2 border border-border/60 bg-muted/20 p-3 rounded-lg">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Link2 size={14} className="text-primary" />
          <span>{label}</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {links.length}/{maxLinks}
          </span>
        </label>
        {links.length < maxLinks && (
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Tambah Tautan</span>
          </button>
        )}
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-muted-foreground/80 italic py-1">
          Belum ada tautan SharePoint/dokumen. Klik "+ Tambah Tautan" untuk melampirkan link (maks. {maxLinks}).
        </p>
      ) : (
        <div className="space-y-2">
          {links.map((link, idx) => {
            const isHttp = /^https?:\/\//i.test(link.url.trim());
            const hasError = link.url.trim().length > 0 && !isHttp;

            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-md bg-paper border border-line"
              >
                <input
                  type="text"
                  placeholder="Label / Judul Link (mis. Folder Foto Lapangan)"
                  value={link.title || ''}
                  onChange={(e) => handleChange(idx, 'title', e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-paper-2 border border-line rounded focus:outline-none focus:border-forest text-ink sm:w-1/3"
                />
                <div className="flex-1 flex items-center gap-1.5">
                  <input
                    type="url"
                    placeholder="https://company.sharepoint.com/..."
                    value={link.url}
                    onChange={(e) => handleChange(idx, 'url', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-paper-2 border border-line rounded focus:outline-none focus:border-forest text-ink"
                  />
                  {isHttp && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate hover:text-forest transition-colors border border-line rounded hover:bg-paper-2 cursor-pointer"
                      title="Buka / Uji Tautan"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 text-slate-2 hover:text-clay transition-colors border border-line rounded hover:bg-clay/10 cursor-pointer"
                    title="Hapus Tautan"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {hasError && (
                  <p className="text-[10px] text-clay sm:w-full mt-0.5">
                    URL harus diawali dengan http:// atau https://
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

