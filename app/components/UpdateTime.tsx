'use client';

import { useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';

interface UpdateTimeProps {
  updatedAt: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function UpdateTime({
  updatedAt,
  onRefresh,
  isRefreshing = false,
}: UpdateTimeProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!updatedAt) {
      setTimeAgo('업데이트 대기 중');
      return;
    }

    const updateTimeAgo = () => {
      const now = new Date();
      const updated = new Date(updatedAt);
      const diffMs = now.getTime() - updated.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) {
        setTimeAgo('방금 전');
      } else if (diffMins < 60) {
        setTimeAgo(`${diffMins}분 전`);
      } else if (diffHours < 24) {
        setTimeAgo(`${diffHours}시간 전`);
      } else {
        const options: Intl.DateTimeFormatOptions = {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        };
        setTimeAgo(updated.toLocaleDateString('ko-KR', options));
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, [updatedAt]);

  return (
    <div className="flex items-center justify-between text-sm font-bold text-black mb-4">
      <div className="flex items-center gap-2 px-3 py-1 bg-[var(--color-nb-blue)] border-thick border-black shadow-hard-sm">
        <Clock className="w-4 h-4" />
        <span>{timeAgo}</span>
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="
            flex items-center gap-2 px-3 py-1 
            bg-white border-thick border-black shadow-hard-sm 
            hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none 
            active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">새로고침</span>
        </button>
      )}
    </div>
  );
}
