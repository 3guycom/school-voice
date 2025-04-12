/**
 * School Comparison page component
 * Created to resolve missing page component error
 * Implements basic structure for school tone comparison feature
 */

import React from 'react';
import { BarChart2 } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';

function SchoolComparison() {
  // Example comparison data
  const comparisonData = [
    { dimension: 'Formality', yourSchool: 80, competitor: 70 },
    { dimension: 'Clarity', yourSchool: 90, competitor: 85 },
    { dimension: 'Warmth', yourSchool: 65, competitor: 75 },
    { dimension: 'Professionalism', yourSchool: 85, competitor: 80 },
    { dimension: 'Approachability', yourSchool: 70, competitor: 85 },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center mb-8">
        <BarChart2 className="h-8 w-8 text-indigo-600 mr-3" />
        <h1 className="text-3xl font-bold text-gray-900">School Comparison</h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Tone Profile Comparison</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={comparisonData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Your School"
                  dataKey="yourSchool"
                  stroke="#4F46E5"
                  fill="#4F46E5"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Competitor"
                  dataKey="competitor"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Compare with another school</h3>
          <div className="flex gap-4">
            <input
              type="url"
              placeholder="Enter school website URL"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Compare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SchoolComparison;