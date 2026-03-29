/**
 * Manager Dashboard Page
 */

import React, { useEffect, useState } from "react";
import approvalService from "../services/approvalService";
import { Approval } from "../types";
import { ApprovalCard } from "../components/Approval/ApprovalCard";
import { Loading } from "../components/Common/Loading";
import "../styles/pages/Dashboard.css";

export const ManagerDashboard: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      const data = await approvalService.getPendingApprovals();
      setApprovals(data);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: number) => {
    try {
      await approvalService.approveExpense(approvalId);
      await loadApprovals();
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleReject = async (approvalId: number) => {
    try {
      await approvalService.rejectExpense(approvalId);
      await loadApprovals();
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="dashboard">
      <h1>Manager Dashboard</h1>

      <div className="approvals-section">
        <h2>Pending Approvals ({approvals.length})</h2>

        {approvals.length === 0 ? (
          <p className="empty-state">No pending approvals</p>
        ) : (
          <div className="approvals-grid">
            {approvals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};