import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import { fmtDateTime } from '../../utils/date';

interface Withdrawal {
  id: string;
  amount: string;
  status: string;
  remark: string | null;
  acceptedAt: string | null;
  createdAt: string;
  screenshot_with?: string | null;
  user: {
    id: string;
    mobile: string;
    name: string;
    wallet: string;
  } | null;
}

interface UserDetails {
  bankDetails?: {
    holderName?: string | null;
    accountNo?: string | null;
    ifsc?: string | null;
    upi?: string | null;
    phonepe?: string | null;
    gpay?: string | null;
    paytm?: string | null;
    bank?: string | null;
    branch?: string | null;
  } | null;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

// Short stable fund reference — 10 chars max
function fundRef(id: string): string {
  return id.replace(/-/g, '').slice(0, 10).toUpperCase();
}

export default function Withdrawals() {
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [viewModal, setViewModal] = useState<Withdrawal | null>(null);
  const [viewUser, setViewUser] = useState<UserDetails | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [approveModal, setApproveModal] = useState<Withdrawal | null>(null);
  const [saving, setSaving] = useState(false);

  const [rejectModal, setRejectModal] = useState<Withdrawal | null>(null);
  const [rejectRemark, setRejectRemark] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/withdrawals', {
        params: { status: status || undefined },
      });
      setRows(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const openView = async (w: Withdrawal) => {
    setViewModal(w);
    setViewUser(null);
    if (w.user?.id) {
      setViewLoading(true);
      try {
        const { data } = await api.get(`/admin/users/${w.user.id}`);
        setViewUser(data.data);
      } catch {
        // ignore
      } finally {
        setViewLoading(false);
      }
    }
  };

  const doApprove = async () => {
    if (!approveModal) return;
    setSaving(true);
    try {
      await api.post(`/admin/withdrawals/${approveModal.id}/approve`);
      setApproveModal(null);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Approve failed');
    } finally {
      setSaving(false);
    }
  };

  const doReject = async () => {
    if (!rejectModal) return;
    setSaving(true);
    try {
      await api.post(`/admin/withdrawals/${rejectModal.id}/reject`, {
        remark: rejectRemark,
      });
      setRejectModal(null);
      setRejectRemark('');
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Reject failed');
    } finally {
      setSaving(false);
    }
  };

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (r.user?.mobile || '').toLowerCase().includes(s) ||
      (r.user?.name || '').toLowerCase().includes(s)
    );
  });

  const stats = {
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    approved: rows.filter((r) => r.status === 'approved').length,
    rejected: rows.filter((r) => r.status === 'rejected').length,
    totalAmount: rows.reduce((s, r) => s + Number(r.amount || 0), 0),
  };

  const columns = [
    {
      key: 'sn',
      label: '#',
      render: (w: Withdrawal) => {
        const i = filtered.indexOf(w);
        return <span className="text-slate-500">{i + 1}</span>;
      },
    },
    {
      key: 'user',
      label: 'User',
      render: (w: Withdrawal) => (
        <div>
          <div className="text-slate-100 font-medium">
            {w.user?.name || '—'}
          </div>
          <div className="font-mono text-xs text-slate-400">
            {w.user?.mobile || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Points',
      render: (w: Withdrawal) => (
        <span className="font-bold text-amber-400">
          ₹{Number(w.amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'requestNo',
      label: 'Request No.',
      render: (w: Withdrawal) => (
        <span className="font-mono text-xs text-slate-400">
          #{fundRef(w.id)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (w: Withdrawal) => (
        <span className="text-xs text-slate-400">
          {fmtDateTime(w.createdAt)}
        </span>
      ),
    },
    {
      key: 'remark',
      label: 'Remark',
      render: (w: Withdrawal) => (
        <span className="text-xs text-slate-400 max-w-[160px] truncate inline-block">
          {w.remark || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (w: Withdrawal) => (
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            w.status === 'approved'
              ? 'bg-emerald-900 text-emerald-300'
              : w.status === 'rejected'
              ? 'bg-red-900 text-red-300'
              : 'bg-amber-900 text-amber-300'
          }`}
        >
          {w.status}
        </span>
      ),
    },
    {
      key: 'view',
      label: 'View',
      render: (w: Withdrawal) => (
        <button
          onClick={() => openView(w)}
          className="text-brand-accent hover:text-yellow-400 text-lg"
          title="View details"
        >
          👁
        </button>
      ),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (w: Withdrawal) =>
        w.status === 'pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => setApproveModal(w)}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded font-medium"
            >
              Approved
            </button>
            <button
              onClick={() => {
                setRejectModal(w);
                setRejectRemark('');
              }}
              className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 rounded font-medium"
            >
              Rejected
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-500">Action taken</span>
        ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Withdraw Points Request
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Approve or reject user withdrawal requests
          </p>
        </div>
        <button onClick={load} className="btn-primary text-sm">
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="card">
          <p className="text-xs text-slate-400">Total Requests</p>
          <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Pending</p>
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Approved</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.approved}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Rejected</p>
          <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-400">Total Amount</p>
          <p className="text-2xl font-bold text-brand-accent">
            ₹{stats.totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-3">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Search mobile or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input w-48"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          empty="No withdrawal requests"
        />
      </div>

      {/* ============ VIEW MODAL ============ */}
      <Modal
        open={!!viewModal}
        onClose={() => {
          setViewModal(null);
          setViewUser(null);
        }}
        title="Withdrawal Request Details"
        width="max-w-3xl"
      >
        {viewModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="User Name" value={viewModal.user?.name || '—'} />
              <Field label="Mobile" value={viewModal.user?.mobile || '—'} mono />
              <Field
                label="Request Points"
                value={`₹${Number(viewModal.amount).toLocaleString()}`}
                highlight
              />
              <Field
                label="Request Number"
                value={`#${fundRef(viewModal.id)}`}
                mono
              />
              <Field
                label="Fund ID"
                value={fundRef(viewModal.id)}
                mono
              />
              <Field
                label="Current Wallet"
                value={`₹${Number(viewModal.user?.wallet || 0).toLocaleString()}`}
              />
              <Field label="Status" value={viewModal.status} capitalize />
              <Field
                label="Request Date"
                value={fmtDateTime(viewModal.createdAt)}
              />
            </div>

            <div className="border-t border-brand-border pt-4">
              <h3 className="text-sm font-bold text-brand-accent mb-3">
                Bank / UPI Details
              </h3>
              {viewLoading ? (
                <p className="text-slate-500 text-sm">Loading...</p>
              ) : viewUser?.bankDetails ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field
                    label="A/C Holder Name"
                    value={viewUser.bankDetails.holderName || '—'}
                  />
                  <Field
                    label="A/C Number"
                    value={viewUser.bankDetails.accountNo || '—'}
                    mono
                  />
                  <Field
                    label="IFSC"
                    value={viewUser.bankDetails.ifsc || '—'}
                    mono
                  />
                  <Field
                    label="Bank Name"
                    value={viewUser.bankDetails.bank || '—'}
                  />
                  <Field
                    label="Branch"
                    value={viewUser.bankDetails.branch || '—'}
                  />
                  <Field
                    label="UPI ID"
                    value={viewUser.bankDetails.upi || '—'}
                    mono
                  />
                  <Field
                    label="Paytm"
                    value={viewUser.bankDetails.paytm || '—'}
                    mono
                  />
                  <Field
                    label="PhonePe"
                    value={viewUser.bankDetails.phonepe || '—'}
                    mono
                  />
                  <Field
                    label="GPay"
                    value={viewUser.bankDetails.gpay || '—'}
                    mono
                  />
                </div>
              ) : (
                <p className="text-slate-500 text-sm">
                  No bank details saved for this user.
                </p>
              )}
            </div>

            {viewModal.remark && (
              <div className="border-t border-brand-border pt-4">
                <p className="text-xs uppercase text-slate-500 mb-1">Remark</p>
                <p className="text-sm text-slate-200">{viewModal.remark}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setViewModal(null);
                  setViewUser(null);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============ APPROVE MODAL ============ */}
      <Modal
        open={!!approveModal}
        onClose={() => setApproveModal(null)}
        title="Approve Withdrawal"
      >
        {approveModal && (
          <div className="space-y-4">
            <div className="bg-amber-900/20 border border-amber-700/50 rounded p-3 text-sm">
              <p className="text-amber-300">
                Are you sure you want to approve this withdrawal?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="User" value={approveModal.user?.name || '—'} />
              <Field
                label="Mobile"
                value={approveModal.user?.mobile || '—'}
                mono
              />
              <Field
                label="Amount"
                value={`₹${Number(approveModal.amount).toLocaleString()}`}
                highlight
              />
              <Field
                label="Request No."
                value={`#${fundRef(approveModal.id)}`}
                mono
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setApproveModal(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={doApprove}
                disabled={saving}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-sm disabled:opacity-40"
              >
                {saving ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============ REJECT MODAL ============ */}
      <Modal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Reject Withdrawal"
      >
        {rejectModal && (
          <div className="space-y-4">
            <div className="bg-red-900/20 border border-red-700/50 rounded p-3 text-sm">
              <p className="text-red-300">
                ⚠ Rejecting will refund the amount to the user's wallet.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="User" value={rejectModal.user?.name || '—'} />
              <Field
                label="Mobile"
                value={rejectModal.user?.mobile || '—'}
                mono
              />
              <Field
                label="Amount to Refund"
                value={`₹${Number(rejectModal.amount).toLocaleString()}`}
                highlight
              />
              <Field
                label="Request No."
                value={`#${fundRef(rejectModal.id)}`}
                mono
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">
                Reason (optional)
              </label>
              <input
                className="input mt-1"
                value={rejectRemark}
                onChange={(e) => setRejectRemark(e.target.value)}
                placeholder="e.g. Invalid bank details"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={doReject}
                disabled={saving}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded text-sm disabled:opacity-40"
              >
                {saving ? 'Processing...' : 'Reject & Refund'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------- Reusable Field ----------
function Field({
  label,
  value,
  highlight,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase text-slate-500 mb-1">{label}</p>
      <p
        className={`text-sm break-all ${
          highlight ? 'text-amber-400 font-bold' : 'text-slate-200'
        } ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}