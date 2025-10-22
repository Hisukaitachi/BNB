// src/components/admin/earnings/components/StatusBadge.jsx
import React from 'react';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    approved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    processing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
        rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
        failed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        refunded: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };

    return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusConfig[status] || statusConfig.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
    };

export default StatusBadge;