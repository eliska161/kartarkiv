import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Trash2, UserPlus, Shield, ShieldOff, Search, X } from 'lucide-react';

interface ClerkUser {
  id: string;
  emailAddresses: Array<{
    emailAddress: string;
    id: string;
  }>;
  firstName: string | null;
  lastName: string | null;
  publicMetadata: {
    isAdmin?: boolean;
  };
  createdAt: number;
  lastSignInAt: number | null;
}

const UserManagement: React.FC = () => {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Kunne ikke hente brukere');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'En feil oppstod');
    } finally {
      setLoading(false);
    }
  }, [getToken, API_BASE_URL]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Er du sikker på at du vil slette denne brukeren?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Kunne ikke slette bruker');
      }

      setUsers(users.filter(user => user.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke slette bruker');
    }
  };

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify({
          isAdmin: !currentAdminStatus
        })
      });

      if (!response.ok) {
        throw new Error('Kunne ikke oppdatere admin-status');
      }

      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, publicMetadata: { ...user.publicMetadata, isAdmin: !currentAdminStatus } }
          : user
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oppdatere admin-status');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail.trim()) {
      setError('E-post er påkrevd');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          firstName: newUserFirstName,
          lastName: newUserLastName,
          isAdmin: newUserIsAdmin
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Kunne ikke opprette bruker');
      }

      const newUser = await response.json();
      setUsers([...users, newUser.user]);
      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserIsAdmin(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke opprette bruker');
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const email = user.emailAddresses[0]?.emailAddress.toLowerCase() || '';
    const firstName = (user.firstName || '').toLowerCase();
    const lastName = (user.lastName || '').toLowerCase();
    
    return email.includes(searchLower) || 
           firstName.includes(searchLower) || 
           lastName.includes(searchLower);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Laster brukere...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Brukeradministrasjon</h2>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 bg-eok-600 text-white px-4 py-2 rounded-lg hover:bg-eok-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Legg til bruker
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Søk etter brukere..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
        />
      </div>

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
                  Sist innlogget
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
                          <span className="text-sm font-medium text-eok-600">
                            {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : 'Ikke oppgitt'
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.emailAddresses[0]?.emailAddress || 'Ikke oppgitt'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleAdmin(user.id, user.publicMetadata?.isAdmin || false)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.publicMetadata?.isAdmin
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {user.publicMetadata?.isAdmin ? (
                        <>
                          <Shield className="h-3 w-3" />
                          Admin
                        </>
                      ) : (
                        <>
                          <ShieldOff className="h-3 w-3" />
                          Bruker
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastSignInAt 
                      ? new Date(user.lastSignInAt).toLocaleDateString('nb-NO')
                      : 'Aldri'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                      title="Slett bruker"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'Ingen brukere funnet for søket.' : 'Ingen brukere funnet.'}
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Legg til ny bruker</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-post *
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fornavn
                </label>
                <input
                  type="text"
                  value={newUserFirstName}
                  onChange={(e) => setNewUserFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etternavn
                </label>
                <input
                  type="text"
                  value={newUserLastName}
                  onChange={(e) => setNewUserLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-eok-500 focus:border-eok-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAdmin"
                  checked={newUserIsAdmin}
                  onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                  className="h-4 w-4 text-eok-600 focus:ring-eok-500 border-gray-300 rounded"
                />
                <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-700">
                  Administrator
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-eok-600 text-white py-2 px-4 rounded-lg hover:bg-eok-700 transition-colors"
                >
                  Opprett bruker
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Avbryt
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
