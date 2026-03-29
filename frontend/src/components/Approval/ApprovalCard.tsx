/**
 * Approval Card Component
 */

import React from "react";
import { Approval } from "../../types";
import { formatDateTime } from "../../utils/helpers";
import "../styles/ApprovalCard.css";

interface ApprovalCardProps {
  approval: Approval;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  loading?: boolean;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  onApprove,
  onReject,
  loading = false,
}) => {
  const isPending = approval.status === "pending";

  return (
    <div className="approval-card">
      <div className="card-header">
        <h3>Expense #{approval.expense_id}</h3>
        <span className={`status status-${approval.status}`}>{approval.status}</span>
      </div>

      <div className="card-body">
        {approval.comments && (
          <div className="comments">
            <strong>Comments:</strong>
            <p>{approval.comments}</p>
          </div>
        )}

        {approval.approved_at && (
          <p className="approved-at">
            Reviewed on: {formatDateTime(approval.approved_at)}
          </p>
        )}
      </div>

      {isPending && (
        <div className="card-footer">
          <button
            className="btn btn-success"
            onClick={() => onApprove(approval.id)}
            disabled={loading}
          >
            ✓ Approve
          </button>
          <button
            className="btn btn-danger"
            onClick={() => onReject(approval.id)}
            disabled={loading}
          >
            ✗ Reject
          </button>
        </div>
      )}
    </div>
  );
};