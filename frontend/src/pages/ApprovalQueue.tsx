import React, { useEffect, useState } from 'react';
import approvalService from '../services/approvalService';
import { Approval } from '../types/approval';
import Navbar from '../components/Common/Navbar';
import toast from 'react-hot-toast';

const ApprovalQueue: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const data = await approvalService.getPendingApprovals();
      setApprovals(data);
    } catch (error) {
      toast.error('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: number) => {
    try {
      await approvalService.approveExpense(approvalId);
      toast.success('Expense approved!');
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to approve expense');
    }
  };

  const handleReject = async (approvalId: number) => {
    try {
      await approvalService.rejectExpense(approvalId);
      toast.success('Expense rejected!');
      fetchApprovals();
    } catch (error) {
      toast.error('Failed to reject expense');
    }
  };

  if (loading) return <div className="loading">Loading approvals...</div>;

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <h1>Pending Approvals</h1>

        {approvals.length === 0 ? (
          <p className="empty-state">No pending approvals</p>
        ) : (
          <div className="approvals-list">
            {approvals.map((approval) => (
              <div key={approval.id} className="approval-card">
                <div className="approval-info">
                  <p><strong>Order:</strong> #{approval.approval_order}</p>
                  <p><strong>Status:</strong> {approval.status}</p>
                </div>

                {approval.status === 'pending' && (
                  <div className="approval-actions">
                    <button
                      onClick={() => handleApprove(approval.id)}
                      className="btn btn-success"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(approval.id)}
                      className="btn btn-danger"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalQueue;