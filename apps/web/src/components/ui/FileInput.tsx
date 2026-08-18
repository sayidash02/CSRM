import React, { useState } from 'react';
import { ExternalLink, Link2, X } from 'lucide-react';
import {
  isSafeSharePointUrl,
  parseSharePointLinks,
  serializeSharePointLinks,
} from './sharePointLinks';

interface SharePointLinkInputProps {
  value: string | null;
  onChange: (value: string) => void;
  multiple?: boolean;
}

function linkLabel(value: string, index: number): string {
  try {
    const url = new URL(value);
    const lastSegment = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '');
    return lastSegment || `Link SharePoint ${index + 1}`;
  } catch {
    return `Link SharePoint ${index + 1}`;
  }
}

/**
 * Manual SharePoint URL field used by every attachment slot in the seven
 * modules. Files are uploaded to the company's SharePoint outside CRMS; this
 * component only stores and displays the URL pasted by the user.
 */
export function SharePointLinkInput({
  value,
  onChange,
  multiple = true,
}: SharePointLinkInputProps) {
  const [draftLink, setDraftLink] = useState('');
  const [validationError, setValidationError] = useState('');
  const links = parseSharePointLinks(value);

  const addLink = () => {
    const candidate = draftLink.trim();
    if (!candidate) return;

    if (!isSafeSharePointUrl(candidate)) {
      setValidationError('Tempel URL SharePoint lengkap yang diawali https://.');
      return;
    }

    if (links.includes(candidate)) {
      setValidationError('Link tersebut sudah ditambahkan.');
      return;
    }

    const nextLinks = multiple ? [...links, candidate] : [candidate];
    onChange(serializeSharePointLinks(nextLinks));
    setDraftLink('');
    setValidationError('');
  };

  const removeLink = (linkToRemove: string) => {
    onChange(serializeSharePointLinks(links.filter((link) => link !== linkToRemove)));
    setValidationError('');
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {links.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1" aria-label="Link SharePoint tersimpan">
          {links.map((link, index) => (
            <div
              key={`${link}-${index}`}
              className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded border border-border w-fit max-w-full"
            >
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 flex items-center gap-1.5 hover:underline truncate"
                title={link}
              >
                <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
                <span className="truncate max-w-[260px]">{linkLabel(link, index)}</span>
              </a>
              <button
                type="button"
                onClick={() => removeLink(link)}
                className="text-red-500 hover:bg-red-50 p-1 rounded-full shrink-0"
                title="Hapus link SharePoint"
                aria-label={`Hapus ${linkLabel(link, index)}`}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2">
        <div className="relative flex-1">
          <Link2
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="url"
            value={draftLink}
            onChange={(event) => {
              setDraftLink(event.target.value);
              if (validationError) setValidationError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addLink();
              }
            }}
            placeholder="Tempel link SharePoint"
            aria-label="Link SharePoint"
            className="w-full pl-9 pr-3 py-2 text-sm bg-input-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={addLink}
          disabled={!draftLink.trim()}
          className="px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Tambah link
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Upload file terlebih dahulu ke SharePoint perusahaan, lalu tempel link HTTPS-nya di sini.
      </p>
      {validationError && (
        <p role="alert" className="text-[11px] text-red-600">
          {validationError}
        </p>
      )}
    </div>
  );
}

// Backward-compatible export while existing consumers migrate to the explicit
// SharePointLinkInput name.
export const FileInput = SharePointLinkInput;
