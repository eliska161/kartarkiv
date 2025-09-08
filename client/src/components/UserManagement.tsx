import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { User, UserPlus, Edit, Trash2, Shield, ShieldOff, X } from 'lucide-react';

// Use relative URLs since Netlify redirects /api/* to Railway
const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : (process.env.REACT_APP_API_URL || 'http://localhost:5000');

interface UserData {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    is_admin: false
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users`);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update existing user
        await axios.put(`${API_BASE_URL}/api/users/${editingUser.id}`, formData);
      } else {
        // Create new user
        await axios.post(`${API_BASE_URL}/api/users`, formData);
      }
      
      await fetchUsers();
      setShowAddUser(false);
      setEditingUser(null);
      setFormData({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        is_admin: false
      });
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert(error.response?.data?.message || 'Kunne ikke lagre bruker');
    }
  };

  const handleEdit = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
      is_admin: user.is_admin
    });
    setShowAddUser(true);
  };

  const handleDelete = async (userId: number) => {
    if (userId === user?.id) {
      alert('Du kan ikke slette deg selv');
      return;
    }

    if (window.confirm('Er du sikker på at du vil slette denne brukeren?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/users/${userId}`);
        await fetchUsers();
      } catch (error: any) {
        console.error('Error deleting user:', error);
        alert(error.response?.data?.message || 'Kunne ikke slette bruker');
      }
    }
  };

  const toggleAdmin = async (userId: number, currentStatus: boolean) => {
    if (userId === user?.id) {
      alert('Du kan ikke endre din egen admin-status');
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/api/users/${userId}`, { is_admin: !currentStatus });
      await fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.response?.data?.message || 'Kunne ikke oppdatere bruker');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Laster brukere...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Brukeradministrasjon</h2>
        <button
          onClick={() => {
            setShowAddUser(true);
            setEditingUser(null);
            setFormData({
              username: '',
              first_name: '',
              last_name: '',
              email: '',
              password: '',
              is_admin: false
            });
          }}
          className="btn-primary flex items-center"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Legg til bruker
        </button>
      </div>

      {/* Add/Edit User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingUser ? 'Rediger bruker' : 'Legg til ny bruker'}
              </h3>
              <button
                onClick={() => {
                  setShowAddUser(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brukernavn
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fornavn
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Etternavn
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-post
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passord {editingUser && '(la stå tomt for å beholde nåværende)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  required={!editingUser}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="is_admin" className="text-sm font-medium text-gray-700">
                  Administrator
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn-primary flex-1">
                  {editingUser ? 'Oppdater' : 'Opprett'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(false);
                    setEditingUser(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Avbryt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                Opprettet
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Handlinger
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((userData) => (
              <tr key={userData.id} className={userData.id === user?.id ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-eok-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-eok-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {userData.first_name} {userData.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{userData.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {userData.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleAdmin(userData.id, userData.is_admin)}
                    disabled={userData.id === user?.id}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      userData.is_admin
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    } ${userData.id === user?.id ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
                  >
                    {userData.is_admin ? (
                      <Shield className="h-3 w-3 mr-1" />
                    ) : (
                      <ShieldOff className="h-3 w-3 mr-1" />
                    )}
                    {userData.is_admin ? 'Admin' : 'Bruker'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(userData.created_at).toLocaleDateString('no-NO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(userData)}
                      className="text-eok-600 hover:text-eok-900"
                      title="Rediger"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(userData.id)}
                      disabled={userData.id === user?.id}
                      className={`text-red-600 hover:text-red-900 ${
                        userData.id === user?.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Slett"
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
  );
};

export default UserManagement;