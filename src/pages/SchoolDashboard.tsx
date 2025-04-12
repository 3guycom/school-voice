/**
 * School Dashboard page
 * Created as a replacement for SchoolComparison page to match import in App.tsx
 * Provides a dashboard overview of the school's activity and metrics
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useSchoolStore } from '../stores/schoolStore';

const SchoolDashboard: React.FC = () => {
  const { schoolId } = useParams<{ schoolId: string }>();
  const { getSchoolById } = useSchoolStore();
  const school = schoolId ? getSchoolById(schoolId) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">School Dashboard</h1>
      {school ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">School Information</h2>
            <p className="text-gray-700 mb-2"><span className="font-medium">Name:</span> {school.name}</p>
            {school.website && (
              <p className="text-gray-700 mb-2">
                <span className="font-medium">Website:</span> 
                <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                  {school.website}
                </a>
              </p>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-500 italic">No recent activity to display</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Tone Profiles</h2>
            <p className="text-gray-500 italic">No tone profiles created yet</p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">School information not found. Please select a valid school.</p>
        </div>
      )}
    </div>
  );
};

export default SchoolDashboard;