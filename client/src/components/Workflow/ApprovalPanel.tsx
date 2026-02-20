import { useState } from 'react';
import type { ApprovalRequest, AgentRole } from '@/types';

interface ApprovalPanelProps {
  request: ApprovalRequest;
  onApprove: (workflowId: string, stepId: string, comment?: string) => void;
  onReject: (workflowId: string, stepId: string, comment: string, retry?: boolean) => void;
}

const roleLabels: Record<AgentRole, string> = {
  PM: 'PM (Requirements)',
  UIUX: 'UI/UX (Design)',
  RD: 'RD (Implementation)',
  QA: 'QA (Test Plan)',
  REVIEW: 'Review (Code Review)',
  TEST: 'Test (Test Execution)',
  CUSTOM: 'Custom',
};

const roleColors: Record<AgentRole, string> = {
  PM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  UIUX: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  RD: 'bg-green-500/20 text-green-400 border-green-500/30',
  QA: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  REVIEW: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  TEST: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  CUSTOM: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export function ApprovalPanel({
  request,
  onApprove,
  onReject,
}: ApprovalPanelProps) {
  const [comment, setComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const handleApprove = () => {
    onApprove(request.workflowId, request.stepId, comment || undefined);
    setComment('');
  };

  const handleReject = (retry: boolean) => {
    if (!rejectComment.trim()) {
      return;
    }
    onReject(request.workflowId, request.stepId, rejectComment, retry);
    setRejectComment('');
    setShowRejectForm(false);
  };

  const roleColor = roleColors[request.stepRole] || roleColors.CUSTOM;
  const roleLabel = roleLabels[request.stepRole] || request.stepRole;

  const timeSince = Math.floor((Date.now() - request.timestamp) / 1000);
  const timeDisplay = timeSince < 60
    ? `${timeSince}s ago`
    : `${Math.floor(timeSince / 60)}m ago`;

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">!</span>
          <span className="text-sm font-medium text-amber-300">
            Awaiting Approval
          </span>
          <span className="text-xs text-slate-500">{timeDisplay}</span>
        </div>
        <span
          className={`px-2 py-0.5 text-xs rounded border ${roleColor}`}
        >
          {roleLabel}
        </span>
      </div>

      {/* Feature Info */}
      <div className="mb-3">
        <div className="text-sm text-slate-300">
          Feature: <span className="text-cyan-400">{request.featureName}</span>
        </div>
        {request.outputArtifacts.length > 0 && (
          <div className="mt-1">
            <span className="text-xs text-slate-500">Output:</span>
            <ul className="mt-1 space-y-0.5">
              {request.outputArtifacts.map((artifact, i) => (
                <li key={i} className="text-xs text-slate-400 font-mono truncate">
                  {artifact}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Comment input for approval */}
      <div className="mb-3">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional comment..."
          className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {/* Action Buttons */}
      {!showRejectForm ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Approve
          </button>
          <button
            onClick={() => setShowRejectForm(true)}
            className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Request Changes
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Describe what needs to be changed..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500/50 resize-none"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleReject(true)}
              disabled={!rejectComment.trim()}
              className="flex-1 px-3 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Request Changes & Retry
            </button>
            <button
              onClick={() => handleReject(false)}
              disabled={!rejectComment.trim()}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Reject & Stop
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setRejectComment('');
              }}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
