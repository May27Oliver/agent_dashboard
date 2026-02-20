import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

// 使用 Map 直接存儲終端實例，避免全域事件系統的效能問題
const terminalRegistry = new Map<string, Terminal>();

interface XTerminalProps {
  agentId: string;
  onInput?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

export interface XTerminalHandle {
  focus: () => void;
  refresh: () => void;
}

export const XTerminal = forwardRef<XTerminalHandle, XTerminalProps>(function XTerminal(
  { agentId, onInput, onResize },
  ref
) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  // Use refs to store callbacks to avoid re-initializing terminal
  const onInputRef = useRef(onInput);
  const onResizeRef = useRef(onResize);

  // Keep refs up to date
  useEffect(() => {
    onInputRef.current = onInput;
    onResizeRef.current = onResize;
  }, [onInput, onResize]);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      theme: {
        background: '#0f172a',
        foreground: '#e2e8f0',
        cursor: '#38bdf8',
        cursorAccent: '#0f172a',
        selectionBackground: '#334155',
        black: '#1e293b',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#f1f5f9',
        brightBlack: '#475569',
        brightRed: '#fca5a5',
        brightGreen: '#86efac',
        brightYellow: '#fde047',
        brightBlue: '#93c5fd',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
      },
      fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 2000, // 減少 scrollback 以節省記憶體
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 註冊到全域 registry，供 writeToTerminal 直接查找
    terminalRegistry.set(agentId, terminal);

    // Send initial size to PTY after terminal is ready
    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        onResizeRef.current?.(cols, rows);
      }
    });

    terminal.onData((data) => {
      onInputRef.current?.(data);
    });

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        onResizeRef.current?.(cols, rows);
      }
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      terminalRegistry.delete(agentId);
      terminal.dispose();
    };
  }, [agentId]); // Only re-initialize when agentId changes


  // Expose focus and refresh methods to parent components
  useImperativeHandle(ref, () => ({
    focus: () => {
      xtermRef.current?.focus();
    },
    refresh: () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        onResizeRef.current?.(cols, rows);
      }
    },
  }), []);

  return (
    <div
      ref={terminalRef}
      className="w-full h-full min-h-[200px] bg-slate-900 rounded-lg overflow-hidden"
    />
  );
});

// 直接寫入終端，使用 O(1) 查找而非全域事件廣播
export function writeToTerminal(agentId: string, data: string) {
  const terminal = terminalRegistry.get(agentId);
  if (terminal) {
    terminal.write(data);
  }
}
