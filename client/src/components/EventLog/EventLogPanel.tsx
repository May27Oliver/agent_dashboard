import { useRef, useEffect, useState } from 'react';
import { useSystemStore } from '@/store/systemStore';
import { EventLogEntry } from './EventLogEntry';
import { getCollapsedState, setCollapsedState } from '@/utils/storage';

interface EventLogPanelProps {
  maxHeight?: string;
}

export function EventLogPanel({ maxHeight = '150px' }: EventLogPanelProps) {
  const { logs, clearLogs } = useSystemStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(
    () => getCollapsedState()['event-log'] ?? false
  );

  useEffect(() => {
    setCollapsedState('event-log', isCollapsed);
  }, [isCollapsed]);

  // Auto-scroll to bottom when new logs arrive (newest at top, so scroll to top)
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <div className="bg-slate-900/80 border-t border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={toggleCollapse}
          className="flex items-center gap-2 hover:text-cyan-400 transition-colors focus:outline-none"
          aria-expanded={!isCollapsed}
          aria-controls="event-log-content"
        >
          <svg
            className={`w-4 h-4 text-slate-400 hover:text-cyan-400 transition-all duration-200 ${
              isCollapsed ? '-rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Event Log
          </span>
          <span className="text-xs text-slate-500">
            ({logs.length} entries)
          </span>
        </button>
        <button
          onClick={clearLogs}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Log entries */}
      <div
        id="event-log-content"
        className={`transition-all duration-250 ease-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'opacity-100'
        }`}
        style={{ maxHeight: isCollapsed ? 0 : maxHeight }}
        aria-hidden={isCollapsed}
      >
        <div
          ref={containerRef}
          className="overflow-y-auto border-t border-slate-700/50"
          style={{ maxHeight }}
        >
          {logs.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-4">
              No events logged
            </div>
          ) : (
            logs.map((log) => <EventLogEntry key={log.id} log={log} />)
          )}
        </div>
      </div>
    </div>
  );
}
