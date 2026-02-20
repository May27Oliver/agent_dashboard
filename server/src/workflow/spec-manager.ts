import * as fs from 'fs';
import * as path from 'path';
import { AgentRole } from '../types';

const SPEC_BASE_DIR = process.env.SPEC_BASE_DIR || process.cwd();

/**
 * Maps roles to their output file names
 */
const ROLE_OUTPUT_FILES: Record<AgentRole, string> = {
  PM: '01-requirement.md',
  UIUX: '02-design.md',
  RD: '03-implementation.md',
  QA: '04-test-plan.md',
  REVIEW: '05-review.md',
  TEST: '04-test-plan.md', // TEST maps to same as QA
  CUSTOM: 'custom-output.md',
};

/**
 * SpecManager handles spec directory creation and file operations
 * for collaborative workflows
 */
export class SpecManager {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || SPEC_BASE_DIR;
  }

  /**
   * Creates the spec directory for a feature
   * @param featureName The name of the feature
   * @returns The full path to the created directory
   */
  createSpecDirectory(featureName: string): string {
    const dirPath = this.getSpecDirectory(featureName);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    return dirPath;
  }

  /**
   * Gets the spec directory path for a feature
   * @param featureName The name of the feature
   * @returns The full path to the spec directory
   */
  getSpecDirectory(featureName: string): string {
    const sanitizedName = this.sanitizeFeatureName(featureName);
    return path.join(this.baseDir, 'spec', sanitizedName);
  }

  /**
   * Gets the output file path for a specific role
   * @param featureName The name of the feature
   * @param role The agent role
   * @returns The full path to the output file
   */
  getOutputPath(featureName: string, role: AgentRole): string {
    const specDir = this.getSpecDirectory(featureName);
    const fileName = ROLE_OUTPUT_FILES[role] || 'output.md';
    return path.join(specDir, fileName);
  }

  /**
   * Reads a spec file for a specific role
   * @param featureName The name of the feature
   * @param role The agent role
   * @returns The file content or null if not found
   */
  readSpecFile(featureName: string, role: AgentRole): string | null {
    const filePath = this.getOutputPath(featureName, role);

    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch {
      console.error(`Failed to read spec file: ${filePath}`);
    }

    return null;
  }

  /**
   * Gets all input artifacts for a role (files from previous steps)
   * @param featureName The name of the feature
   * @param role The agent role
   * @returns Array of file paths that exist
   */
  getInputArtifactsForRole(featureName: string, role: AgentRole): string[] {
    const roleOrder: AgentRole[] = ['PM', 'UIUX', 'RD', 'QA', 'REVIEW'];
    const currentIndex = roleOrder.indexOf(role);

    if (currentIndex <= 0) {
      return [];
    }

    const artifacts: string[] = [];
    for (let i = 0; i < currentIndex; i++) {
      const prevRole = roleOrder[i];
      const filePath = this.getOutputPath(featureName, prevRole);
      if (fs.existsSync(filePath)) {
        artifacts.push(filePath);
      }
    }

    return artifacts;
  }

  /**
   * Lists all spec files in a feature directory
   * @param featureName The name of the feature
   * @returns Array of file names
   */
  listSpecFiles(featureName: string): string[] {
    const specDir = this.getSpecDirectory(featureName);

    try {
      if (fs.existsSync(specDir)) {
        return fs.readdirSync(specDir).filter(f => f.endsWith('.md'));
      }
    } catch {
      console.error(`Failed to list spec files: ${specDir}`);
    }

    return [];
  }

  /**
   * Checks if a spec directory exists
   * @param featureName The name of the feature
   * @returns true if directory exists
   */
  specDirectoryExists(featureName: string): boolean {
    return fs.existsSync(this.getSpecDirectory(featureName));
  }

  /**
   * Sanitizes a feature name for use as a directory name
   * @param featureName The raw feature name
   * @returns Sanitized name safe for file system
   */
  private sanitizeFeatureName(featureName: string): string {
    return featureName
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-') // Keep Chinese characters
      .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
      .substring(0, 100); // Limit length
  }
}

// Singleton instance
let specManagerInstance: SpecManager | null = null;

export function getSpecManager(baseDir?: string): SpecManager {
  if (!specManagerInstance || baseDir) {
    specManagerInstance = new SpecManager(baseDir);
  }
  return specManagerInstance;
}
