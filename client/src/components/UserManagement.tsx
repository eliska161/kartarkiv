import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Trash2, Edit, Plus, Search, Filter, UserPlus, X, RefreshCw } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '../utils/errorHandler';
import { apiGet, apiPut, apiDelete, apiPost } from '../utils/apiClient';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
  publicMetadata: {
    isAdmin?: boolean;
  };
  createdAt: string;
  lastSignInAt: string | null;
  status?: 'active' | 'banned' | 'locked';
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [editingUser, setEditingUser] = useState<ClerkUser | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [isInviting, setIsInviting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Always fetch users on component mount/refresh
    console.log('🔄 UserManagement: Fetching users on mount');
    fetchUsers();
    
    // Refresh users every 30 seconds to catch new invitations
    const interval = setInterval(() => {
      console.log('🔄 UserManagement: Auto-refreshing users');
      fetchUsers(true); // Silent refresh
    }, 30000);
    
    return () => {
      console.log('🔄 UserManagement: Cleaning up interval');
      clearInterval(interval);
    };
  }, []);

  // Also fetch users when component becomes visible (handles browser refresh)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUsers(true);
      }
    };

    const handleFocus = () => {
      fetchUsers(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchUsers = async (showRefreshSpinner = false) => {
    try {
      console.log('🔄 UserManagement: Starting fetchUsers, showRefreshSpinner:', showRefreshSpinner);
      
      if (showRefreshSpinner) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/admin/users`);
      console.log('🔄 UserManagement: API response received:', response.data);
      
      // Handle both array and object with users property
      let usersData = response.data;
      if (response.data && typeof response.data === 'object' && response.data.users) {
        usersData = response.data.users;
      }
      
      if (usersData && Array.isArray(usersData)) {
        setUsers(usersData);
        console.log('🔄 UserManagement: Users updated successfully:', usersData.length, 'users');
        if (showRefreshSpinner) {
          showSuccessToast('Brukerliste oppdatert');
        }
      } else {
        console.error('❌ UserManagement: Invalid response format:', response.data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showErrorToast('Kunne ikke hente brukerliste');
      setUsers([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      console.log('🔄 UserManagement: fetchUsers completed');
    }
  };

  const handleToggleAdmin = async (user: ClerkUser) => {
    try {
      const newAdminStatus = !user.publicMetadata?.isAdmin;
      await axios.put(`${API_BASE_URL}/api/admin/users/${user.id}/role`, {
        isAdmin: newAdminStatus
      });
      
      setUsers(prev => prev.map(u => 
        u.id === user.id 
          ? { ...u, publicMetadata: { ...u.publicMetadata, isAdmin: newAdminStatus } }
          : u
      ));
      
      showSuccessToast(`${newAdminStatus ? 'Gav' : 'Fjernet'} administratorrettigheter til ${user.firstName || user.emailAddresses?.[0]?.emailAddress || 'bruker'}`);
    } catch (error) {
      console.error('Error updating user:', error);
      showErrorToast('Kunne ikke oppdatere bruker');
    }
  };

  const handleDeleteUser = async (user: ClerkUser) => {
    if (!window.confirm(`Er du sikker på at du vil slette brukeren "${user.firstName || user.emailAddresses?.[0]?.emailAddress || 'bruker'}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/admin/users/${user.id}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showSuccessToast('Brukeren ble slettet');
    } catch (error) {
      console.error('Error deleting user:', error);
      showErrorToast('Kunne ikke slette bruker');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      await axios.post(`${API_BASE_URL}/api/admin/users/invite`, {
        email: inviteEmail,
        role: inviteRole
      });
      
      showSuccessToast(`Invitasjon sendt til ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('user');
      setShowAddUser(false);
      // Refresh user list to show any immediate changes
      setTimeout(() => fetchUsers(true), 1000);
    } catch (error) {
      console.error('Error inviting user:', error);
      showErrorToast('Kunne ikke sende invitasjon');
    } finally {
      setIsInviting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.emailAddresses && user.emailAddresses[0]?.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = 
      filterRole === 'all' ||
      (filterRole === 'admin' && user.publicMetadata?.isAdmin) ||
      (filterRole === 'user' && !user.publicMetadata?.isAdmin);
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-eok-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Brukeradministrasjon</h2>
          <p className="text-gray-600">Administrer brukere og tilganger</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => fetchUsers(true)}
            disabled={isRefreshing}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Oppdaterer...' : 'Oppdater'}
          </button>
          <button
            onClick={() => setShowAddUser(true)}
            className="btn-primary flex items-center"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Inviter bruker
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter brukere..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
            />
          </div>
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as 'all' | 'admin' | 'user')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
        >
          <option value="all">Alle roller</option>
          <option value="admin">Administratorer</option>
          <option value="user">Brukere</option>
        </select>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bruker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-post
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rolle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sist aktiv
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-eok-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-eok-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName || user.lastName 
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : 'Navn ikke satt'
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {user.emailAddresses?.[0]?.emailAddress || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.publicMetadata?.isAdmin
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.publicMetadata?.isAdmin ? 'Administrator' : 'Bruker'}
                      </span>
                      {user.status && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                          user.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'banned'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.status === 'active' ? 'Aktiv' : user.status === 'banned' ? 'Bannlyst' : 'Låst'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastSignInAt 
                      ? new Date(user.lastSignInAt).toLocaleDateString('no-NO')
                      : 'Aldri'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleToggleAdmin(user)}
                        className={`text-sm px-3 py-1 rounded-md ${
                          user.publicMetadata?.isAdmin
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {user.publicMetadata?.isAdmin ? 'Fjern admin' : 'Gjør admin'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-900"
                        title="Slett bruker"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen brukere funnet</h3>
          <p className="text-gray-500">
            {searchTerm || filterRole !== 'all'
              ? 'Prøv å endre søkekriteriene dine'
              : 'Det er ingen brukere registrert ennå'
            }
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <User className="h-8 w-8 text-eok-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Totalt antall brukere</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Administratorer</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.publicMetadata?.isAdmin).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <User className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Vanlige brukere</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => !u.publicMetadata?.isAdmin).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invite User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Inviter ny bruker</h3>
              <button
                onClick={() => setShowAddUser(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleInviteUser} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-postadresse
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
                  placeholder="bruker@example.com"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rolle
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'user' | 'admin')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
                >
                  <option value="user">Bruker</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="btn-primary flex items-center"
                >
                  {isInviting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sender...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send invitasjon
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
