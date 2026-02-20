import * as pty from 'node-pty';
import * as os from 'os';
import { expandTilde } from '../utils/shell';

export interface PtyExecutorOptions {
  shell?: string;
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  useClaudeCli?: boolean; // 是否使用 Claude CLI 模式
  onData: (data: string) => void;
  onExit: (code: number) => void;
}

export class PtyExecutor {
  private ptyProcess: pty.IPty;
  private isRunning: boolean = true;

  constructor(private options: PtyExecutorOptions) {
    const useClaudeCli = options.useClaudeCli ?? true; // 預設使用 Claude CLI
    const shell = options.shell || (os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash');

    const env = {
      ...process.env,
      ...options.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    };

    const cwd = options.cwd ? expandTilde(options.cwd) : (process.env.HOME || os.homedir());

    // 決定啟動命令：Claude CLI 或普通 shell
    const command = useClaudeCli ? 'claude' : shell;
    const args: string[] = [];

    console.log(`Starting PTY with command: ${command}, cwd: ${cwd}, useClaudeCli: ${useClaudeCli}`);

    this.ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      cols: options.cols || 120,
      rows: options.rows || 30,
      cwd,
      env: env as Record<string, string>,
    });

    this.ptyProcess.onData((data) => {
      if (this.isRunning) {
        this.options.onData(data);
      }
    });

    this.ptyProcess.onExit(({ exitCode }) => {
      console.log('PTY exited with code:', exitCode);
      this.isRunning = false;
      this.options.onExit(exitCode);
    });
  }

  write(data: string): void {
    if (this.isRunning) {
      this.ptyProcess.write(data);
    }
  }

  resize(cols: number, rows: number): void {
    if (this.isRunning) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  kill(): void {
    if (this.isRunning) {
      this.isRunning = false;
      this.ptyProcess.kill();
    }
  }

  get pid(): number {
    return this.ptyProcess.pid;
  }
}
