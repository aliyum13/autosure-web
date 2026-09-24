'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ChevronRight } from 'lucide-react';

interface RecentVIN {
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  viewedAt: number;
}

export function saveRecentVIN(entry: Omit<RecentVIN, 'viewedAt'>) {
  try {
    const raw = localStorage.getItem('checkam_recent_vins');
    const list: RecentVIN[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((v) => v.vin !== entry.vin);
    const updated = [{ ...entry, viewedAt: Date.now() }, ...filtered].slice(0, 5);
    localStorage.setItem('checkam_recent_vins', JSON.stringify(updated));
  } catch {}
}

export default function RecentlyViewed() {
  const [recents, setRecents] = useState<RecentVIN[]>([]);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('checkam_recent_vins');
      if (raw) setRecents(JSON.parse(raw));
    } catch {}
  }, []);

  if (recents.length === 0) return null;

  return (
    <div className="max-w-xl mt-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-xs text-slate-400 font-medium">Recently checked</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {recents.map((entry) => (
          <button
            key={entry.vin}
            onClick={() => router.push(`/preview/${entry.vin}`)}
            className="flex items-center gap-2 bg-white hover:bg-ch-surface border border-ch-border rounded-lg px-3 py-2 transition-colors duration-200 ease-out group"
          >
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-700 font-mono">{entry.vin}</p>
              {(entry.year || entry.make || entry.model) && (
                <p className="text-xs text-slate-400">
                  {[entry.year, entry.make, entry.model].filter(Boolean).join(' ')}
                </p>
              )}
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
