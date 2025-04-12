import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { 
  Users, 
  School, 
  Settings, 
  Clipboard, 
  Search, 
  Shield, 
  UserCheck,
  UserX,
  RefreshCw,
  AlertTriangle,
  LogOut,
  Plus,
  X,
  Mail,
  Lock,
  Globe
} from 'lucide-react';
import { SystemStats, User, School as SchoolType } from '../types';

const SuperAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user, isSuperAdmin, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'schools' | 'audit'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats>({
    schools: 0,
    users: 0,
    profiles: 0,
    drafts: 0
  });
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddSchoolModal, setShowAddSchoolModal] = useState(false);
  
  // Form states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserSuperAdmin, setNewUserSuperAdmin] = useState(false);
  const [newUserSchoolId, setNewUserSchoolId] = useState('');
  const [newUserSchoolRole, setNewUserSchoolRole] = useState<'admin' | 'member'>('member');
  const [userFormError, setUserFormError] = useState('');
  const [userFormLoading, setUserFormLoading] = useState(false);
  
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolWebsite, setNewSchoolWebsite] = useState('');
  const [schoolFormError, setSchoolFormError] = useState('');
  const [schoolFormLoading, setSchoolFormLoading] = useState(false);
  
  // Check super admin status
  useEffect(() => {
    if (user && !isSuperAdmin()) {
      navigate('/');
    }
  }, [user, isSuperAdmin, navigate]);
  
  // Load dashboard stats
  useEffect(() => {
    if (!isSuperAdmin()) return;
    
    const loadStats = async () => {
      setLoading(true);
      try {
        // Try to refresh the session first to ensure fresh JWT
        const { data: { session } } = await supabase.auth.getSession();

        // Verify super admin status before attempting to get stats
        const { data: superAdminCheck } = await supabase.rpc('check_user_super_admin', {
          user_email: session?.user?.email || ''
        });

        if (!superAdminCheck) {
          throw new Error('Super admin privileges required');
        }

        // Get counts from various tables using direct RPC calls to avoid policy recursion
        const { data: statData, error: statError } = await supabase.rpc('get_admin_statistics');

        if (statError) throw statError;

        if (statData) {
          setStats({
            schools: statData.school_count || 0,
            users: statData.user_count || 0,
            profiles: statData.profile_count || 0,
            drafts: statData.draft_count || 0
          });
        } else {
          // Fallback method if RPC isn't available
          // Get counts from various tables 
          const { count: schoolCount } = await supabase
            .from('schools')
            .select('*', { count: 'exact', head: true });
            
          const { count: userCount } = await supabase
            .from('school_members')
            .select('user_id', { count: 'exact', head: true });
            
          const { count: profileCount } = await supabase
            .from('tone_profiles')
            .select('*', { count: 'exact', head: true });
            
          const { count: draftCount } = await supabase
            .from('content_drafts')
            .select('*', { count: 'exact', head: true });
          
          setStats({
            schools: schoolCount || 0,
            users: userCount || 0,
            profiles: profileCount || 0,
            drafts: draftCount || 0
          });
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, [isSuperAdmin]);
  
  // Load schools - Updated to use only the RPC function
  const loadSchools = async () => {
    if (!isSuperAdmin()) return;
    
    setLoading(true);
    try {
      const { data: schoolsData, error } = await supabase
        .rpc('get_all_schools_for_admin');
        
      if (error) {
        console.error('Error loading schools:', error);
        throw error;
      }
      
      setSchools(schoolsData || []);
    } catch (error) {
      console.error('Error loading schools:', error);
      // Show error message to user
      alert('Failed to load schools. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load users - Updated to handle RPC errors
  const loadUsers = async () => {
    if (!isSuperAdmin()) return;
    
    setLoading(true);
    try {
      const { data: membersData, error } = await supabase
        .rpc('get_all_school_members_for_admin');
        
      if (error) {
        console.error('Error loading users:', error);
        throw error;
      }
      
      // Group the data by user
      const userMap = new Map<string, any>();
      
      membersData?.forEach(member => {
        if (!userMap.has(member.user_id)) {
          userMap.set(member.user_id, {
            id: member.user_id,
            email: member.email,
            displayName: member.display_name,
            isSuperAdmin: member.is_super_admin,
            schools: []
          });
        }
        
        if (member.school_id) { // Only add school if it exists
          const user = userMap.get(member.user_id);
          user.schools.push({
            id: member.school_id,
            name: member.school_name,
            role: member.role
          });
        }
      });
      
      setUsers(Array.from(userMap.values()));
    } catch (error) {
      console.error('Error loading users:', error);
      // Show error message to user
      alert('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'schools') {
      loadSchools();
    }
  }, [activeTab]);
  
  // Filter users based on search
  const filteredUsers = searchQuery
    ? users.filter(user => 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users;
    
  // Filter schools based on search
  const filteredSchools = searchQuery
    ? schools.filter(school => 
        school.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : schools;
  
  // Toggle super admin status for a user
  const toggleSuperAdmin = async (userId: string, email: string, currentStatus: boolean) => {
    if (!isSuperAdmin()) return;
    
    if (window.confirm(`Are you sure you want to ${currentStatus ? 'remove' : 'grant'} super admin privileges ${currentStatus ? 'from' : 'to'} ${email}?`)) {
      try {
        const { error } = await supabase.rpc('set_super_admin', { 
          user_email: email,
          is_admin: !currentStatus
        });
        
        if (error) throw error;
        
        // Update local state
        setUsers(users.map(u => 
          u.id === userId 
            ? { ...u, isSuperAdmin: !currentStatus } 
            : u
        ));
      } catch (error) {
        console.error('Error toggling super admin status:', error);
        alert('Failed to update admin status. Please try again.');
      }
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Add new user - using edge function instead of direct auth admin API
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserPassword) {
      setUserFormError('Email and password are required');
      return;
    }
    
    setUserFormLoading(true);
    setUserFormError('');
    
    try {
      // Get the current user's JWT
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('You must be logged in to create users');
      }

      // Use the admin-create-user edge function instead of direct admin.createUser
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          fullName: newUserName || undefined,
          isSuperAdmin: newUserSuperAdmin,
          schoolId: newUserSchoolId || undefined,
          schoolRole: newUserSchoolRole
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }
      
      // Update local state if needed (we'll refresh the user list)
      await loadUsers();
      
      // Reset form
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserSchoolId('');
      setNewUserSchoolRole('member');
      setNewUserSuperAdmin(false);
      setShowAddUserModal(false);
      
    } catch (error: any) {
      console.error('Error adding user:', error);
      setUserFormError(error.message || 'Failed to create user');
    } finally {
      setUserFormLoading(false);
    }
  };
  
  // Add new school - using RPC function to bypass policies
  // Fixed to ensure proper boolean type for is_admin parameter
  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSchoolName) {
      setSchoolFormError('School name is required');
      return;
    }
    
    setSchoolFormLoading(true);
    setSchoolFormError('');
    
    try {
      // Use RPC function to create school safely
      const { data, error } = await supabase.rpc('create_school_for_admin', {
        school_name: newSchoolName,
        school_website: newSchoolWebsite || null,
        is_admin: true  // Ensure this is a boolean, not an empty string
      });
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('School was not created');
      }
      
      // Update local state
      await loadSchools();
      
      // Reset form
      setNewSchoolName('');
      setNewSchoolWebsite('');
      setShowAddSchoolModal(false);
      
      // Show success message
      alert('School created successfully!');
      
    } catch (error: any) {
      console.error('Error adding school:', error);
      setSchoolFormError(error.message || 'Failed to create school');
    } finally {
      setSchoolFormLoading(false);
    }
  };

  if (!isSuperAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Access Denied
          </h2>
          <p className="mt-2 text-gray-600">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-indigo-700 flex items-center">
          <Shield className="mr-2 h-8 w-8" />
          Super Admin Dashboard
        </h1>
        
        <button
          onClick={handleSignOut}
          className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Sign Out
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`mr-4 py-2 px-4 font-medium text-sm ${
            activeTab === 'dashboard'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`mr-4 py-2 px-4 font-medium text-sm ${
            activeTab === 'users'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`mr-4 py-2 px-4 font-medium text-sm ${
            activeTab === 'schools'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('schools')}
        >
          Schools
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeTab === 'audit'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Log
        </button>
      </div>
      
      {/* Content for each tab */}
      {activeTab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                  <Users className="h-8 w-8" />
                </div>
                <div className="ml-4">
                  <h2 className="text-sm font-medium text-gray-600">Total Users</h2>
                  <p className="text-2xl font-bold text-gray-900">{stats.users}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <School className="h-8 w-8" />
                </div>
                <div className="ml-4">
                  <h2 className="text-sm font-medium text-gray-600">Total Schools</h2>
                  <p className="text-2xl font-bold text-gray-900">{stats.schools}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Settings className="h-8 w-8" />
                </div>
                <div className="ml-4">
                  <h2 className="text-sm font-medium text-gray-600">Tone Profiles</h2>
                  <p className="text-2xl font-bold text-gray-900">{stats.profiles}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <Clipboard className="h-8 w-8" />
                </div>
                <div className="ml-4">
                  <h2 className="text-sm font-medium text-gray-600">Content Drafts</h2>
                  <p className="text-2xl font-bold text-gray-900">{stats.drafts}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">System Overview</h2>
            <p className="text-gray-600 mb-6">
              Welcome to the Super Admin Dashboard. From here, you can manage all aspects of the School Voice platform.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Quick Actions</h3>
                <ul className="space-y-2">
                  <li>
                    <button 
                      className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                      onClick={() => {
                        setActiveTab('users');
                        loadSchools(); // Load schools first so they're available for selection
                        setShowAddUserModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New User
                    </button>
                  </li>
                  <li>
                    <button 
                      className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                      onClick={() => {
                        setActiveTab('schools');
                        setShowAddSchoolModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New School
                    </button>
                  </li>
                  <li>
                    <button 
                      className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                      onClick={() => setActiveTab('users')}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Users
                    </button>
                  </li>
                  <li>
                    <button 
                      className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                      onClick={() => setActiveTab('schools')}
                    >
                      <School className="h-4 w-4 mr-2" />
                      Manage Schools
                    </button>
                  </li>
                  <li>
                    <button 
                      className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center"
                      onClick={() => setActiveTab('audit')}
                    >
                      <Clipboard className="h-4 w-4 mr-2" />
                      View Audit Logs
                    </button>
                  </li>
                  <li>
                    <button 
                      className="text-red-600 hover:text-red-800 text-sm flex items-center"
                      onClick={handleSignOut}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </li>
                </ul>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-2">Recent Super Admin Activity</h3>
                <p className="text-gray-500 text-sm italic">
                  No recent activities to display.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium text-gray-900">All Users</h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button 
                onClick={loadUsers}
                className="p-2 rounded-md hover:bg-gray-100"
                title="Refresh users"
              >
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="py-8 text-center">
              <RefreshCw className="h-8 w-8 text-indigo-600 mx-auto animate-spin" />
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-600">No users found{searchQuery ? ' matching your search' : ''}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schools
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-semibold">
                              {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.displayName || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.schools?.length > 0 ? (
                            <div className="space-y-1">
                              {user.schools.map((school, index) => (
                                <div key={index} className="flex items-center">
                                  <span className="truncate max-w-xs">{school.name}</span>
                                  <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    school.role === 'admin' 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-green-100 text-green-800'
                                  }`}>
                                    {school.role}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">No schools</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isSuperAdmin ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Super Admin
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Regular User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="space-x-2">
                          <button
                            onClick={() => toggleSuperAdmin(user.id, user.email, !!user.isSuperAdmin)}
                            className={`inline-flex items-center ${
                              user.isSuperAdmin
                                ? 'text-red-600 hover:text-red-800'
                                : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            {user.isSuperAdmin ? (
                              <>
                                <UserX className="h-4 w-4 mr-1" />
                                Revoke Super Admin
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                Make Super Admin
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'schools' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium text-gray-900">All Schools</h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search schools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button 
                onClick={loadSchools}
                className="p-2 rounded-md hover:bg-gray-100"
                title="Refresh schools"
              >
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => setShowAddSchoolModal(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add School
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="py-8 text-center">
              <RefreshCw className="h-8 w-8 text-indigo-600 mx-auto animate-spin" />
              <p className="mt-2 text-gray-600">Loading schools...</p>
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-600">No schools found{searchQuery ? ' matching your search' : ''}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      School
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Website
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSchools.map((school) => (
                    <tr key={school.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <School className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {school.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {school.website ? (
                          <a
                            href={school.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800 flex items-center"
                          >
                            <Globe className="h-4 w-4 mr-1" />
                            Visit Website
                          </a>
                        ) : (
                          <span className="text-gray-500 italic">No website</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(school.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {/* Handle view school */}}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium text-gray-900">Audit Log</h2>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search audit log..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-md border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <button 
                onClick={() => {/* Handle refresh */}}
                className="p-2 rounded-md hover:bg-gray-100"
                title="Refresh audit log"
              >
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          
          <div className="py-8 text-center">
            <p className="text-gray-600">Audit log functionality coming soon.</p>
          </div>
        </div>
      )}
      
      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New User</h3>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser}>
              {userFormError && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {userFormError}
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="pl-10 block w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="pl-10 block w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="John Doe"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  School (Optional)
                </label>
                <select
                  value={newUserSchoolId}
                  onChange={(e) => setNewUserSchoolId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">No School</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {newUserSchoolId && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    School Role
                  </label>
                  <select
                    value={newUserSchoolRole}
                    onChange={(e) => setNewUserSchoolRole(e.target.value as 'admin' | 'member')}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newUserSuperAdmin}
                    onChange={(e) => setNewUserSuperAdmin(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Grant Super Admin privileges
                  </span>
                </label>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userFormLoading}
                  className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md ${
                    userFormLoading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-indigo-700'
                  }`}
                >
                  {userFormLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Add School Modal */}
      {showAddSchoolModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New School</h3>
              <button
                onClick={() => setShowAddSchoolModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSchool}>
              {schoolFormError && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                  {schoolFormError}
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  School Name
                </label>
                <input
                  type="text"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter school name"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Website (Optional)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={newSchoolWebsite}
                    onChange={(e) => setNewSchoolWebsite(e.target.value)}
                    className="pl-10 block w-full rounded-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddSchoolModal(false)}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schoolFormLoading}
                  className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md ${
                    schoolFormLoading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-indigo-700'
                  }`}
                >
                  {schoolFormLoading ? 'Creating...' : 'Create School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;