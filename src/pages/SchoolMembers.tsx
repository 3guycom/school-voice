/**
 * SchoolMembers.tsx
 * Displays and manages school members for administrators
 * Updated to use stored procedure for fetching members
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Plus, UserX, ShieldCheck, User, Mail, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppRoutes } from '../types/routes';

type SchoolMember = {
  id: string;
  user_id: string;
  role: 'admin' | 'member';
  user_email: string;
  user_full_name?: string;
};

const SchoolMembers: React.FC = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [members, setMembers] = useState<SchoolMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch school members
  useEffect(() => {
    if (!schoolId) return;

    const fetchMembers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .rpc('get_school_members', { p_school_id: schoolId });

        if (error) throw error;
        setMembers(data as SchoolMember[]);
      } catch (error) {
        console.error('Error fetching school members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [schoolId]);

  // Filter members based on search
  const filteredMembers = members.filter(member => {
    const email = member.user_email?.toLowerCase() || '';
    const name = member.user_full_name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return email.includes(query) || name.includes(query);
  });

  // Handle inviting new members
  const handleInvite = () => {
    navigate(AppRoutes.INVITATIONS.replace(':schoolId', schoolId || ''));
  };

  // Remove member
  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    // Prevent removing yourself
    if (memberUserId === user?.id) {
      alert("You cannot remove yourself from the school");
      return;
    }

    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        const { error } = await supabase
          .from('school_members')
          .delete()
          .eq('id', memberId);

        if (error) throw error;
        setMembers(members.filter(m => m.id !== memberId));
      } catch (error) {
        console.error('Error removing member:', error);
      }
    }
  };

  // Toggle role between admin and member
  const handleToggleRole = async (memberId: string, currentRole: 'admin' | 'member', memberUserId: string) => {
    // Prevent changing your own role
    if (memberUserId === user?.id) {
      alert("You cannot change your own role");
      return;
    }

    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    const message = currentRole === 'admin' 
      ? "This will change this user from admin to member. Continue?"
      : "This will make this user an admin with full control. Continue?";

    if (window.confirm(message)) {
      try {
        const { error } = await supabase
          .from('school_members')
          .update({ role: newRole })
          .eq('id', memberId);

        if (error) throw error;
        setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      } catch (error) {
        console.error('Error updating member role:', error);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">School Members</h1>
        <button
          onClick={handleInvite}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search members by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? "No members match your search" : "No members found"}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.user_full_name || 'User'}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="h-3 w-3 mr-1" />
                          {member.user_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {member.role === 'admin' ? (
                        <>
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Admin
                        </>
                      ) : (
                        <>
                          <User className="mr-1 h-3 w-3" />
                          Member
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* Only show these actions if this is not the current user */}
                    {member.user_id !== user?.id && (
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleToggleRole(member.id, member.role, member.user_id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Change to {member.role === 'admin' ? 'Member' : 'Admin'}
                        </button>
                        <button 
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Remove
                        </button>
                      </div>
                    )}
                    {member.user_id === user?.id && (
                      <span className="text-gray-400 italic">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SchoolMembers;