import React, { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface FileInputProps {
  value: string | null;
  onChange: (val: string) => void;
  activityDate?: string;
  picName?: string;
  multiple?: boolean;
}

export function FileInput({ value, onChange, activityDate, picName, multiple = true }: FileInputProps) {
  const [uploading, setUploading] = useState(false);

  // Helper to parse legacy strings or JSON array strings
  let fileList: string[] = [];
  if (value) {
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        fileList = JSON.parse(value);
      } catch {
        fileList = [value];
      }
    } else {
      fileList = [value];
    }
  }

  const handleRemove = (urlToRemove: string) => {
    const newList = fileList.filter(url => url !== urlToRemove);
    if (newList.length === 0) onChange("");
    else onChange(JSON.stringify(newList));
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {fileList.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          {fileList.map((url, i) => {
            const fileName = url.split('/').pop()?.split('?')[0] || `Document ${i+1}`;
            return (
              <div key={i} className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded border border-border w-fit max-w-full">
                <a href={url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 flex items-center gap-1.5 hover:underline truncate" title={fileName}>
                  <ExternalLink size={14} className="shrink-0" />
                  <span className="truncate max-w-[200px]">{fileName}</span>
                </a>
                <button type="button" onClick={() => handleRemove(url)} className="text-red-500 hover:bg-red-50 p-1 rounded-full shrink-0" title="Hapus file">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input 
          type="file"
          multiple={multiple}
          disabled={uploading}
          onChange={async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            
            setUploading(true);
            const newUrls: string[] = [];
            const originalButtonText = e.target.className;
            
            try {
              for (let i = 0; i < files.length; i++) {
                const fd = new FormData();
                fd.append("file", files[i]);
                if (activityDate) fd.append("activity_date", activityDate);
                if (picName) fd.append("pic_name", picName);

                const res = await apiClient.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                newUrls.push(res.data.data.url);
              }

              const combined = [...fileList, ...newUrls];
              onChange(JSON.stringify(combined));
            } catch (err: any) {
              alert("Beberapa file gagal diunggah: " + (err.response?.data?.error || err.message));
            } finally {
              setUploading(false);
              e.target.value = "";
            }
          }} 
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer disabled:opacity-50" 
        />
      </div>
    </div>
  );
}
