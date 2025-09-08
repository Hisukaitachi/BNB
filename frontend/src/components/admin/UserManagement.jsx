// frontend/src/components/admin/UserManagement.jsx - CLEANED VERSION
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Ban, 
  Shield,
  RefreshCw,
  MoreHorizontal,
  Mail,
  UserCog
} from 'lucide-react';
import adminService from '../../services/adminService';
import Button from '../ui/Button';
import Input from '../ui/Input';

const UserManagement = () => {
  // Temporarily use alert instead of showToast to fix the error
  const showToast = (message, type) => alert(message);
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.id.toString().includes(term)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => !user.is_banned);
      } else if (statusFilter === 'banned') {
        filtered = filtered.filter(user => user.is_banned);
      }
    }

    setFilteredUsers(filtered);
  };

  const handleUserAction = async (userId, action, additionalData = {}) => {
    try {
      setActionLoading(prev => ({ ...prev, [userId]: action }));
      
      let result;
      switch (action) {
        case 'ban':
          const banReason = additionalData.reason || prompt('Reason for ban (optional):') || 'Violation of terms of service';
          result = await adminService.banUser(userId, banReason);
          break;
        case 'unban':
          result = await adminService.unbanUser(userId);
          break;
        case 'updateRole':
          result = await adminService.updateUserRole(userId, additionalData.role);
          break;
        default:
          throw new Error('Invalid action');
      }

      if (result.success) {
        await loadUsers(); // Refresh users
        alert(`User ${action}ed successfully`);
      }
    } catch (error) {
      alert(`Failed to ${action} user: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getUserStatusBadge = (user) => {
    if (user.is_banned) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Banned</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      host: 'bg-purple-100 text-purple-800',
      client: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || 'bg-gray-100 text-gray-800'}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadUsers} variant="gradient">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400">
            {filteredUsers.length} of {users.length} users
          </p>
        </div>
        
        <Button
          onClick={loadUsers}
          variant="outline"
          className="border-gray-600 text-gray-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Roles</option>
            <option value="client">Client</option>
            <option value="host">Host</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>

          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Filter className="w-4 h-4" />
            <span>Filters Applied</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No users found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">User</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Role</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Joined</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Last Login</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-700/50">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.name}</div>
                          <div className="text-gray-400 text-sm">{user.email}</div>
                          <div className="text-gray-500 text-xs">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="py-4 px-6">
                      {getUserStatusBadge(user)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {new Date(user.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <div className="text-white">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                        </div>
                        <div className="text-gray-400">
                          {user.last_login ? new Date(user.last_login).toLocaleTimeString() : ''}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {!user.is_banned ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            loading={actionLoading[user.id] === 'ban'}
                            onClick={() => handleUserAction(user.id, 'ban')}
                            disabled={user.role === 'admin'}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-400 hover:text-green-300"
                            loading={actionLoading[user.id] === 'unban'}
                            onClick={() => handleUserAction(user.id, 'unban')}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                        )}

                        <div className="relative group">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                          
                          <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg border border-gray-600 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(user.email);
                                alert('Email copied to clipboard');
                              }}
                              className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-600 w-full text-left"
                            >
                              <Mail className="w-4 h-4" />
                              <span>Copy Email</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowRoleModal(true);
                              }}
                              className="flex items-center space-x-2 px-4 py-2 text-blue-400 hover:bg-gray-600 w-full text-left"
                              disabled={user.role === 'admin'}
                            >
                              <UserCog className="w-4 h-4" />
                              <span>Change Role</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <UserDetailModal 
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onAction={handleUserAction}
        />
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <RoleChangeModal 
          user={selectedUser}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedUser(null);
          }}
          onConfirm={(newRole) => {
            handleUserAction(selectedUser.id, 'updateRole', { role: newRole });
            setShowRoleModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

// User Detail Modal Component
const UserDetailModal = ({ user, onClose, onAction }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">User Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Basic Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white ml-2">{user.name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white ml-2">{user.email}</span>
                </div>
                <div>
                  <span className="text-gray-400">Role:</span>
                  <span className="text-white ml-2 capitalize">{user.role}</span>
                </div>
                <div>
                  <span className="text-gray-400">User ID:</span>
                  <span className="text-white ml-2">{user.id}</span>
                </div>
                <div>
                  <span className="text-gray-400">Joined:</span>
                  <span className="text-white ml-2">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Account Status</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className={`ml-2 ${user.is_banned ? 'text-red-400' : 'text-green-400'}`}>
                    {user.is_banned ? 'Banned' : 'Active'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Last Login:</span>
                  <span className="text-white ml-2">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            Close
          </Button>
          
          {!user.is_banned && user.role !== 'admin' && (
            <Button
              onClick={() => {
                onAction(user.id, 'ban');
                onClose();
              }}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
            >
              Ban User
            </Button>
          )}
          
          {user.is_banned && (
            <Button
              onClick={() => {
                onAction(user.id, 'unban');
                onClose();
              }}
              variant="gradient"
              className="bg-green-600 hover:bg-green-700"
            >
              Unban User
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Role Change Modal Component
const RoleChangeModal = ({ user, onClose, onConfirm }) => {
  const [selectedRole, setSelectedRole] = useState(user.role);
  
  const roles = [
    { value: 'client', label: 'Client', description: 'Can book listings' },
    { value: 'host', label: 'Host', description: 'Can create and manage listings' },
    { value: 'admin', label: 'Admin', description: 'Full administrative access' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Change User Role</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-300 mb-4">
            Changing role for: <span className="font-medium text-white">{user.name}</span>
          </p>
          <p className="text-gray-400 text-sm mb-4">
            Current role: <span className="capitalize">{user.role}</span>
          </p>
          
          <div className="space-y-3">
            {roles.map((role) => (
              <label key={role.value} className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <div className="text-white font-medium">{role.label}</div>
                  <div className="text-gray-400 text-sm">{role.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            Cancel
          </Button>
          
          <Button
            onClick={() => onConfirm(selectedRole)}
            variant="gradient"
            disabled={selectedRole === user.role}
          >
            Update Role
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;