import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, Shield, Trash2, Search, UserPlus, X, RefreshCw } from 'lucide-react';
import { apiGet, apiPut, apiDelete, apiPost } from '../utils/apiClient';
import { useConfirmation } from '../hooks/useConfirmation';
import { useToast } from '../contexts/ToastContext';
import ConfirmationModal from './ConfirmationModal';

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
  publicMetadata: {
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    roles?: string[];
  };
  createdAt: string;
  lastSignInAt: string | null;
  status?: 'active' | 'banned' | 'locked';
}

const hasSuperAdminRole = (metadata: ClerkUser['publicMetadata'] | undefined) => {
  if (!metadata) return false;
  if (metadata.isSuperAdmin) return true;
  if (Array.isArray(metadata.roles)) {
    return metadata.roles.map(role => String(role).toLowerCase()).includes('superadmin');
  }
  return false;
};

const isAdminRole = (metadata: ClerkUser['publicMetadata'] | undefined) => {
  if (!metadata) return false;
  return Boolean(metadata.isAdmin) || hasSuperAdminRole(metadata);
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [showAddUser, setShowAddUser] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user');
  const [isInviting, setIsInviting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const confirmation = useConfirmation();
  const { showSuccess, showError } = useToast();

  const fetchUsers = useCallback(async (showRefreshSpinner = false) => {
    try {
      console.log('🔄 UserManagement: Starting fetchUsers, showRefreshSpinner:', showRefreshSpinner);

      if (showRefreshSpinner) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await apiGet('/api/admin/users');
      console.log('🔄 UserManagement: API response received:', response);
      console.log('🔄 UserManagement: Response data:', response.data);
      
      // Backend returns array directly
      const usersData = response.data;
      
      if (usersData && Array.isArray(usersData)) {
        setUsers(usersData);
        console.log('🔄 UserManagement: Users updated successfully:', usersData.length, 'users');
        console.log('🔄 UserManagement: Users data:', usersData.map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          email: u.emailAddresses?.[0]?.emailAddress,
          isAdmin: isAdminRole(u.publicMetadata)
        })));
        if (showRefreshSpinner) {
          showSuccess('Brukerliste oppdatert');
        }
      } else {
        console.error('❌ UserManagement: Invalid response format:', response);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Kunne ikke hente brukerliste');
      setUsers([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      console.log('🔄 UserManagement: fetchUsers completed');
    }
  }, [showError, showSuccess]);

  const fetchInvitations = useCallback(async () => {
    try {
      console.log('🔄 UserManagement: Fetching invitations...');
      const response = await apiGet('/api/admin/invitations');
      console.log('🔄 UserManagement: Invitations response:', response);
      console.log('🔄 UserManagement: Invitations data:', response.data);
      setInvitations(response.data || []);
      console.log('🔄 UserManagement: Invitations fetched:', response.data?.length || 0);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      setInvitations([]);
    }
  }, []);

  useEffect(() => {
    // Only fetch users on component mount
    console.log('🔄 UserManagement: Fetching users on mount');
    fetchUsers();
    fetchInvitations();
  }, [fetchUsers, fetchInvitations]);

  const handleToggleAdmin = async (user: ClerkUser) => {
    try {
      if (hasSuperAdminRole(user.publicMetadata)) {
        showError('Superadministrator-roller kan ikke endres fra dette panelet.');
        return;
      }

      const newAdminStatus = !isAdminRole(user.publicMetadata);
      await apiPut(`/api/admin/users/${user.id}/role`, {
        isAdmin: newAdminStatus
      });

      setUsers(prev => prev.map(u =>
        u.id === user.id
          ? { ...u, publicMetadata: { ...u.publicMetadata, isAdmin: newAdminStatus } }
          : u
      ));
      
      showSuccess(`${newAdminStatus ? 'Gav' : 'Fjernet'} administratorrettigheter til ${user.firstName || user.emailAddresses?.[0]?.emailAddress || 'bruker'}`);
    } catch (error) {
      console.error('Error updating user:', error);
      showError('Kunne ikke oppdatere bruker');
    }
  };

  const handleDeleteUser = async (user: ClerkUser) => {
    const confirmed = await confirmation.confirm({
      title: 'Slett bruker',
      message: `Er du sikker på at du vil slette brukeren "${user.firstName || user.emailAddresses?.[0]?.emailAddress || 'bruker'}"?\n\nDette kan ikke angres.`,
      confirmText: 'Slett',
      cancelText: 'Avbryt',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await apiDelete(`/api/admin/users/${user.id}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showSuccess('Brukeren ble slettet');
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Kunne ikke slette bruker');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsInviting(true);
      await apiPost('/api/admin/users/invite', {
        email: inviteEmail,
        role: inviteRole
      });
      
      showSuccess(`Invitasjon sendt til ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('user');
      setShowAddUser(false);
      // Refresh invitations and user list
      fetchInvitations();
      setTimeout(() => fetchUsers(true), 1000);
    } catch (error) {
      console.error('Error inviting user:', error);
      showError('Kunne ikke sende invitasjon');
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
      (filterRole === 'admin' && isAdminRole(user.publicMetadata)) ||
      (filterRole === 'user' && !isAdminRole(user.publicMetadata));
    
    return matchesSearch && matchesRole;
  });

  const filteredInvitations = invitations.filter(invitation => {
    const matchesSearch = invitation.emailAddress?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = 
      filterRole === 'all' ||
      (filterRole === 'admin' && isAdminRole(invitation.publicMetadata)) ||
      (filterRole === 'user' && !isAdminRole(invitation.publicMetadata));
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as 'all' | 'admin' | 'user')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
              {filteredUsers.map((user) => {
                const userIsAdmin = isAdminRole(user.publicMetadata);
                const userIsSuperAdmin = hasSuperAdminRole(user.publicMetadata);

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.imageUrl ? (
                          <img
                            src={user.imageUrl}
                            alt={`${user.firstName || user.lastName || 'Bruker'} profilbilde`}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                              // Fallback to default icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center"><svg class="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg></div>';
                              }
                            }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-brand-600" />
                          </div>
                        )}
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
                        userIsAdmin
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {userIsSuperAdmin ? 'Superadministrator' : userIsAdmin ? 'Administrator' : 'Bruker'}
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
                        disabled={userIsSuperAdmin}
                        className={`text-sm px-3 py-1 rounded-md ${
                          userIsSuperAdmin
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : userIsAdmin
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {userIsSuperAdmin ? 'Superadmin' : userIsAdmin ? 'Fjern admin' : 'Gjør admin'}
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
                );
              })}
              
              {/* Invitations */}
              {filteredInvitations.map((invitation) => {
                const invitationIsAdmin = isAdminRole(invitation.publicMetadata);
                const invitationIsSuperAdmin = hasSuperAdminRole(invitation.publicMetadata);

                return (
                  <tr key={`invitation-${invitation.id}`} className="hover:bg-gray-50 bg-yellow-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <UserPlus className="h-5 w-5 text-yellow-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          Ventende invitasjon
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {invitation.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {invitation.emailAddress}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invitationIsAdmin
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {invitationIsSuperAdmin ? 'Superadministrator' : invitationIsAdmin ? 'Administrator' : 'Bruker'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
                        <UserPlus className="h-3 w-3 mr-1" />
                        Ventende
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invitation.createdAt).toLocaleDateString('no-NO')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <span className="text-gray-400 text-sm">
                        Vente på at brukeren aksepterer invitasjonen
                      </span>
                    </div>
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && filteredInvitations.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen brukere eller invitasjoner funnet</h3>
          <p className="text-gray-500">
            {searchTerm || filterRole !== 'all'
              ? 'Prøv å endre søkekriteriene dine'
              : 'Det er ingen brukere eller invitasjoner registrert ennå'
            }
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <User className="h-8 w-8 text-brand-600" />
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
                {users.filter(u => isAdminRole(u.publicMetadata)).length}
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
                {users.filter(u => !isAdminRole(u.publicMetadata)).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invite User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={confirmation.onClose}
        onConfirm={confirmation.onConfirm}
        title={confirmation.options.title}
        message={confirmation.options.message}
        confirmText={confirmation.options.confirmText}
        cancelText={confirmation.options.cancelText}
        type={confirmation.options.type}
      />
    </div>
  );
};

export default UserManagement;
