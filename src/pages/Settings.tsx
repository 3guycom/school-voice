/**
 * Settings page component
 * Updated to implement school settings management and user preferences
 */

import React from 'react';
import { Settings as SettingsIcon, User, School, Bell, Shield, CreditCard } from 'lucide-react';
import { useSchoolStore } from '../stores/schoolStore';
import SchoolSettingsForm from '../components/SchoolSettingsForm';

function Settings() {
  const [activeTab, setActiveTab] = React.useState('school');
  const { fetchSchool } = useSchoolStore();

  React.useEffect(() => {
    fetchSchool();
  }, [fetchSchool]);

  const tabs = [
    { id: 'school', label: 'School', icon: School },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center mb-8">
        <SettingsIcon className="h-8 w-8 text-indigo-600 mr-3" />
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Settings tabs">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  py-4 px-1 inline-flex items-center border-b-2 font-medium text-sm
                  ${activeTab === id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'school' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold mb-6">School Settings</h2>
              <SchoolSettingsForm />
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
              <p className="text-gray-500">Profile management coming soon.</p>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold mb-6">Notification Preferences</h2>
              <p className="text-gray-500">Notification settings coming soon.</p>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold mb-6">Security Settings</h2>
              <p className="text-gray-500">Security settings coming soon.</p>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold mb-6">Billing Information</h2>
              <p className="text-gray-500">Billing features coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;