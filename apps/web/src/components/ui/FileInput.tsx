import React from 'react';
import { ExternalLink } from 'lucide-react';
import { apiClient } from '../../lib/apiClient';

interface FileInputProps {
  value: string | null;
  onChange: (url: string) => void;
  activityDate?: string;
  picName?: string;
}

export function FileInput({ value, onChange, activityDate, picName }: FileInputProps) {
  if (value) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <a href={value} target="_blank" rel="noreferrer" className="text-sm text-blue-600 flex items-center gap-1 hover:underline">
          <ExternalLink size={14} /> Lihat Dokumen
        </a>
        <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 hover:underline">
          Hapus
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input 
        type="file" 
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          
          const fd = new FormData();
          fd.append("file", file);
          if (activityDate) fd.append("activity_date", activityDate);
          if (picName) fd.append("pic_name", picName);

          try {
            e.target.disabled = true;
            const res = await apiClient.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            onChange(res.data.data.url);
          } catch (err: any) {
            alert("Upload gagal: " + (err.response?.data?.error || err.message));
          } finally {
            e.target.disabled = false;
            e.target.value = "";
          }
        }} 
        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" 
      />
    </div>
  );
}
