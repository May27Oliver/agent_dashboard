import * as os from 'os';
import * as path from 'path';

/**
 * Escapes a string for safe use in shell arguments using single quotes.
 * This prevents shell injection attacks.
 */
export function escapeShellArg(arg: string): string {
  // Single quotes prevent all shell interpretation except for single quotes themselves
  // We handle single quotes by ending the quoted string, adding an escaped single quote, and starting a new quoted string
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Expands tilde (~) to the user's home directory.
 */
export function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

/**
 * Validates that a path is within allowed directories.
 * Returns true if the path is safe, false otherwise.
 */
export function isPathAllowed(
  requestedPath: string,
  allowedPaths: string[] = [os.homedir()],
): boolean {
  const normalizedRequest = path.resolve(expandTilde(requestedPath));

  return allowedPaths.some((allowed) => {
    const normalizedAllowed = path.resolve(expandTilde(allowed));
    // Check if the requested path starts with an allowed path
    return (
      normalizedRequest === normalizedAllowed ||
      normalizedRequest.startsWith(normalizedAllowed + path.sep)
    );
  });
}

/**
 * Sanitizes a path by resolving it and checking for directory traversal attempts.
 * Returns the resolved path if safe, or null if potentially malicious.
 */
export function sanitizePath(basePath: string, userPath: string): string | null {
  const resolvedBase = path.resolve(expandTilde(basePath));
  const resolvedFull = path.resolve(resolvedBase, userPath);

  // Check for directory traversal - the resolved path must start with the base path
  if (!resolvedFull.startsWith(resolvedBase + path.sep) && resolvedFull !== resolvedBase) {
    return null;
  }

  return resolvedFull;
}
