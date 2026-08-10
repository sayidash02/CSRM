import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, X, Loader2 } from 'lucide-react';
import { useStakeholders, useCreateStakeholder } from '../../hooks/useStakeholders';

interface StakeholderComboboxProps {
  value?: string | number | null;
  onChange: (stakeholderId: string, stakeholderName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function StakeholderCombobox({
  value,
  onChange,
  placeholder = "Pilih atau cari stakeholder...",
  disabled = false,
  className = "",
}: StakeholderComboboxProps) {
  const { data: stakeholders = [], isLoading } = useStakeholders();
  const createMutation = useCreateStakeholder();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected stakeholder object
  const selectedStakeholder = useMemo(() => {
    if (!value) return null;
    return stakeholders.find(s => String(s.id) === String(value)) || null;
  }, [value, stakeholders]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStakeholders = useMemo(() => {
    if (!searchQuery.trim()) return stakeholders;
    const q = searchQuery.toLowerCase().trim();
    return stakeholders.filter(s => s.name.toLowerCase().includes(q));
  }, [stakeholders, searchQuery]);

  const exactMatchExists = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return stakeholders.some(s => s.name.toLowerCase() === q);
  }, [stakeholders, searchQuery]);

  const handleSelect = (id: string, name: string) => {
    onChange(id, name);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleCreateNew = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || createMutation.isPending) return;

    try {
      const newStakeholder = await createMutation.mutateAsync(trimmed);
      handleSelect(String(newStakeholder.id), newStakeholder.name);
    } catch (err) {
      console.error("Gagal membuat stakeholder baru:", err);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        className={`w-full px-3 py-2 text-sm bg-input-background border border-border rounded-md flex items-center justify-between gap-2 cursor-pointer transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-ring'
        } ${isOpen ? 'ring-2 ring-ring border-transparent' : ''}`}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
      >
        <div className="flex-1 min-w-0 overflow-hidden">
          {isOpen ? (
            <input
              type="text"
              autoFocus
              className="w-full bg-transparent border-none p-0 text-sm focus:outline-none text-foreground placeholder:text-muted-foreground"
              placeholder="Ketik untuk mencari atau membuat baru..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          ) : selectedStakeholder ? (
            <span className="text-foreground truncate block font-medium">
              {selectedStakeholder.name}
            </span>
          ) : (
            <span className="text-muted-foreground truncate block">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedStakeholder && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Hapus pilihan"
            >
              <X size={14} />
            </button>
          )}
          <ChevronsUpDown size={14} className="text-muted-foreground" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-card border border-border rounded-md shadow-lg py-1 text-sm">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span>Memuat stakeholder...</span>
            </div>
          ) : (
            <>
              {filteredStakeholders.length > 0 ? (
                filteredStakeholders.map(s => {
                  const isSelected = String(s.id) === String(value);
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleSelect(String(s.id), s.name)}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="truncate">{s.name}</span>
                      {isSelected && <Check size={14} className="text-primary shrink-0" />}
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-1.5 text-xs text-muted-foreground">
                  Tidak ada stakeholder yang cocok
                </div>
              )}

              {searchQuery.trim() !== '' && !exactMatchExists && (
                <div
                  onClick={handleCreateNew}
                  className="border-t border-border px-3 py-2 text-primary font-medium hover:bg-primary/5 cursor-pointer flex items-center gap-2 transition-colors"
                >
                  {createMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin shrink-0" />
                  ) : (
                    <Plus size={14} className="shrink-0" />
                  )}
                  <span className="truncate">
                    {createMutation.isPending
                      ? "Membuat..."
                      : `Tambah "${searchQuery.trim()}"`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
