import React from 'react';
import { ChevronRight, Wallet, Receipt, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Button from '../../../ui/Button';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';

const DetailedView = ({ analytics, payouts, refunds, statusFilter, setStatusFilter }) => {
  if (!analytics) return null;

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      approved: CheckCircle,
      processing: Clock,
      completed: CheckCircle,
      rejected: XCircle,
      failed: AlertCircle
    };
    return icons[status] || AlertCircle;
  };

  return (
    <>
      {/* Payout Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(analytics.payoutStatusDistribution).map(([status, count]) => {
          const Icon = getStatusIcon(status);
          const statusColors = {
            pending: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
            approved: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
            processing: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
            completed: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
            rejected: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
            failed: 'from-gray-500/20 to-gray-600/10 border-gray-500/30 text-gray-400'
          };

          return (
            <div 
              key={status} 
              className={`bg-gradient-to-br ${statusColors[status]} rounded-xl p-4 border cursor-pointer hover:scale-105 transition-transform`}
              onClick={() => setStatusFilter(status)}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium capitalize">{status}</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatNumber(count)}</div>
              <div className="text-xs text-gray-400 mt-1">payouts</div>
            </div>
          );
        })}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Total Processed"
          value={formatCurrency(analytics.totalPaidToHosts)}
          subtitle={`${analytics.payoutStatusDistribution.completed} completed payouts`}
          icon={Wallet}
          color="green"
        />
        <SummaryCard
          title="Pending Amount"
          value={formatCurrency(analytics.pendingHostPayouts)}
          subtitle={`${analytics.payoutStatusDistribution.pending} pending requests`}
          icon={Clock}
          color="orange"
        />
        <SummaryCard
          title="Total Refunds"
          value={formatCurrency(analytics.totalRefunded)}
          subtitle={`${formatNumber(refunds.filter(r => r.status === 'completed').length)} processed`}
          icon={Receipt}
          color="red"
        />
      </div>

      {/* Recent Payouts Table */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-semibold text-white">Recent Payouts</h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/admin/payouts'}
              className="border-gray-600 text-gray-300"
            >
              Manage Payouts
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        <PayoutsTable 
          payouts={statusFilter === 'all' 
            ? payouts 
            : payouts.filter(p => p.status === statusFilter)
          } 
        />
      </div>

      {/* Recent Refunds */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Recent Refunds</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/admin/refunds'}
            className="border-gray-600 text-gray-300"
          >
            Manage Refunds
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <RefundsTable refunds={refunds} />
      </div>
    </>
  );
};

const SummaryCard = ({ title, value, subtitle, icon: Icon, color }) => {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-red-600',
    red: 'from-red-500 to-pink-600'
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-gradient-to-br ${colorClasses[color]} rounded-xl`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <p className="text-sm text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-white mb-2">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
};

const PayoutsTable = ({ payouts }) => {
  if (!payouts || payouts.length === 0) {
    return (
      <div className="text-center py-12">
        <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-400">No payouts found</p>
        <p className="text-gray-500 text-sm">Payouts will appear here once processed</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">ID</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Host</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Amount</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Fee</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Net</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Method</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Date</th>
          </tr>
        </thead>
        <tbody>
          {payouts.slice(0, 10).map((payout) => (
            <tr key={payout.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
              <td className="py-3 px-4 text-white font-mono text-sm">#{payout.id}</td>
              <td className="py-3 px-4">
                <div className="text-white">{payout.host_name || 'N/A'}</div>
                <div className="text-xs text-gray-400">{payout.host_email}</div>
              </td>
              <td className="py-3 px-4 text-white font-semibold">{formatCurrency(payout.amount)}</td>
              <td className="py-3 px-4 text-green-400">{formatCurrency(payout.fee)}</td>
              <td className="py-3 px-4 text-blue-400">{formatCurrency(payout.net_amount)}</td>
              <td className="py-3 px-4 text-gray-300 capitalize">
                {payout.payment_method?.replace('_', ' ') || 'N/A'}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={payout.status} />
              </td>
              <td className="py-3 px-4 text-gray-400 text-sm">
                {formatDate(payout.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RefundsTable = ({ refunds }) => {
  if (!refunds || refunds.length === 0) {
    return (
      <div className="text-center py-12">
        <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-400">No refunds found</p>
        <p className="text-gray-500 text-sm">Refund requests will appear here</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">ID</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Booking</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Client</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Amount Paid</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Refund</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Status</th>
            <th className="text-left py-3 px-4 text-gray-400 font-medium text-sm">Date</th>
          </tr>
        </thead>
        <tbody>
          {refunds.slice(0, 5).map((refund) => (
            <tr key={refund.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
              <td className="py-3 px-4 text-white font-mono text-sm">#{refund.id}</td>
              <td className="py-3 px-4 text-white">#{refund.booking_id}</td>
              <td className="py-3 px-4">
                <div className="text-white">{refund.client_name || 'N/A'}</div>
                <div className="text-xs text-gray-400">{refund.client_email}</div>
              </td>
              <td className="py-3 px-4 text-white">{formatCurrency(refund.amount_paid || 0)}</td>
              <td className="py-3 px-4 text-red-400 font-semibold">{formatCurrency(refund.refund_amount || 0)}</td>
              <td className="py-3 px-4">
                <StatusBadge status={refund.status} />
              </td>
              <td className="py-3 px-4 text-gray-400 text-sm">
                {formatDate(refund.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DetailedView;