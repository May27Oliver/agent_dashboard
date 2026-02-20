import { AgentRole, AgentSkill } from '../types';
import { skillRegistry } from './skill-registry';
import { escapeShellArg } from '../utils/shell';

/**
 * Default prompts for each role in collaborative workflows
 */
export const DEFAULT_ROLE_PROMPTS: Record<AgentRole, string> = {
  PM: `You are a Product Manager. Analyze the feature request and create a requirements document.

Input: {{featureName}}
Output file: {{outputPath}}

Create a comprehensive requirements document that includes:
1. Feature Overview
2. User Stories (As a..., I want..., So that...)
3. Acceptance Criteria
4. Non-functional Requirements
5. Out of Scope

Write the document in markdown format to the output file.`,

  UIUX: `You are a UI/UX Designer. Based on the requirements, create a design specification.

Feature: {{featureName}}
Requirements: {{inputFiles}}
Output file: {{outputPath}}

Create a design specification that includes:
1. User Flow Diagram (text description)
2. Component List
3. Layout Specifications
4. Interaction Patterns
5. Responsive Design Considerations
6. Accessibility Requirements

Write the document in markdown format to the output file.`,

  RD: `You are a Software Developer. Based on the requirements and design, create an implementation plan.

Feature: {{featureName}}
Input files: {{inputFiles}}
Output file: {{outputPath}}

Create an implementation plan that includes:
1. Technical Architecture Overview
2. File Structure
3. Component/Module Breakdown
4. API Endpoints (if applicable)
5. Database Changes (if applicable)
6. Implementation Steps
7. Dependencies

Write the document in markdown format to the output file.`,

  QA: `You are a QA Engineer. Based on all documentation, create a test plan.

Feature: {{featureName}}
Input files: {{inputFiles}}
Output file: {{outputPath}}

Create a comprehensive test plan that includes:
1. Test Strategy
2. Test Scope
3. Test Cases (organized by feature area)
4. Edge Cases and Boundary Conditions
5. Integration Test Scenarios
6. Performance Test Considerations
7. Acceptance Test Checklist

Write the document in markdown format to the output file.`,

  REVIEW: `You are a Code Reviewer. Review the implementation plan and provide feedback.

Feature: {{featureName}}
Input files: {{inputFiles}}
Output file: {{outputPath}}

Create a review report that includes:
1. Architecture Review
2. Potential Issues and Risks
3. Security Considerations
4. Performance Considerations
5. Code Quality Recommendations
6. Suggested Improvements
7. Approval Status and Next Steps

Write the document in markdown format to the output file.`,

  TEST: `You are a Tester. Create and execute test cases for the feature.

Feature: {{featureName}}
Input files: {{inputFiles}}
Output file: {{outputPath}}

Create a test report that includes:
1. Test Execution Summary
2. Test Results
3. Bugs Found
4. Test Coverage Analysis

Write the document in markdown format to the output file.`,

  CUSTOM: `Complete the assigned task for feature: {{featureName}}

Input files: {{inputFiles}}
Output file: {{outputPath}}

Write your output in markdown format to the output file.`,
};

/**
 * CommandTemplate handles variable interpolation for workflow commands
 */
export class CommandTemplate {
  /**
   * Interpolates variables in a command string
   * @param command The command template with {{variable}} placeholders
   * @param variables Object containing variable values
   * @returns The interpolated command string
   */
  static interpolate(
    command: string,
    variables: Record<string, string | string[]>,
  ): string {
    let result = command;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const stringValue = Array.isArray(value) ? value.join(', ') : value;
      result = result.replace(placeholder, stringValue);
    }

    return result;
  }

  /**
   * Gets the default prompt for a role with variables interpolated
   * @param role The agent role
   * @param variables Variables to interpolate
   * @returns The interpolated prompt
   */
  static getDefaultPrompt(
    role: AgentRole,
    variables: Record<string, string | string[]>,
  ): string {
    const template = DEFAULT_ROLE_PROMPTS[role] || DEFAULT_ROLE_PROMPTS.CUSTOM;
    return this.interpolate(template, variables);
  }

  /**
   * Builds the full command for an agent step
   * @param role The agent role
   * @param featureName The feature name
   * @param specDirectory The spec directory path
   * @param inputFiles Array of input file paths
   * @param outputPath The output file path
   * @param customPrompt Optional custom prompt to use instead of default
   * @returns The full command string
   */
  static buildCommand(
    role: AgentRole,
    featureName: string,
    specDirectory: string,
    inputFiles: string[],
    outputPath: string,
    customPrompt?: string,
  ): string {
    const variables: Record<string, string | string[]> = {
      featureName,
      specDirectory,
      specPath: specDirectory,
      inputFiles: inputFiles.length > 0 ? inputFiles : ['(none)'],
      outputPath,
    };

    const prompt = customPrompt
      ? this.interpolate(customPrompt, variables)
      : this.getDefaultPrompt(role, variables);

    // Build a Claude CLI command with properly escaped argument
    // Note: This assumes claude CLI is available in the agent's environment
    return `claude --print ${escapeShellArg(prompt)}`;
  }

  /**
   * Validates that all required variables are present
   * @param command The command template
   * @param variables Available variables
   * @returns Array of missing variable names
   */
  static validateVariables(
    command: string,
    variables: Record<string, string | string[]>,
  ): string[] {
    const placeholderRegex = /\{\{(\w+)\}\}/g;
    const missing: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(command)) !== null) {
      const varName = match[1];
      if (!(varName in variables)) {
        missing.push(varName);
      }
    }

    return missing;
  }

  /**
   * Builds a command from a skill's promptTemplate
   * @param skill The skill to use
   * @param variables Variables to interpolate
   * @returns The built command string
   */
  static buildCommandFromSkill(
    skill: AgentSkill,
    variables: Record<string, string | string[]>,
  ): string {
    const prompt = this.interpolate(skill.promptTemplate, variables);
    // Build a Claude CLI command with properly escaped argument
    return `claude --print ${escapeShellArg(prompt)}`;
  }

  /**
   * Builds a command for a workflow step using skill or default role prompt
   * @param role The agent role
   * @param skillId Optional skill ID to use
   * @param featureName The feature name
   * @param projectPath The project path
   * @param specDirectory The spec directory path
   * @param inputFiles Array of input file paths
   * @param outputPath The output file path
   * @param customPrompt Optional custom prompt to use instead of default
   * @returns The full command string
   */
  static buildWorkflowStepCommand(
    role: AgentRole,
    skillId: string | undefined,
    featureName: string,
    projectPath: string,
    specDirectory: string,
    inputFiles: string[],
    outputPath: string,
    customPrompt?: string,
  ): string {
    const variables: Record<string, string | string[]> = {
      featureName,
      projectPath,
      specDirectory,
      specPath: specDirectory,
      inputFiles: inputFiles.length > 0 ? inputFiles : ['(none)'],
      outputPath,
    };

    // 如果有自訂 prompt，優先使用
    if (customPrompt) {
      const prompt = this.interpolate(customPrompt, variables);
      return `claude --print ${escapeShellArg(prompt)}`;
    }

    // 如果有指定 skillId，使用 skill 的 promptTemplate
    if (skillId) {
      const skill = skillRegistry.getSkill(skillId);
      if (skill) {
        return this.buildCommandFromSkill(skill, variables);
      }
    }

    // 最後使用預設的 role prompt
    return this.buildCommand(role, featureName, specDirectory, inputFiles, outputPath);
  }
}
