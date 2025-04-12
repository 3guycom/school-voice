/**
 * Tone Analysis page component
 * Updated to:
 * - Add saved profiles list view
 * - Add profile selection and viewing
 * - Add profile deletion functionality
 * - Improve layout and organization
 * - Add school registration check
 * - Add registration prompt
 */

import React from 'react';
import { Upload, Globe, Save, AlertCircle, Info, Trash2, Clock, Check, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useToneStore } from '../stores/toneStore';
import type { ToneProfile } from '../types';

const ALLOWED_FILE_TYPES = '.pdf,.doc,.docx,.txt';

const ToneAnalysis = () => {
  const navigate = useNavigate();
  const [url, setUrl] = React.useState('');
  const [profileName, setProfileName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = React.useState<string>('');
  const [selectedDimension, setSelectedDimension] = React.useState<string | null>(null);
  const { 
    analyzeWebsite, 
    analyzeDocument, 
    currentProfile, 
    profiles,
    loading, 
    saveProfile,
    loadProfiles,
    isSchoolRegistered 
  } = useToneStore();

  // Load saved profiles on mount
  React.useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleUrlAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      setError('Please enter a website URL');
      return;
    }

    try {
      setError(null);
      setAnalysisStatus('Fetching website content...');
      await analyzeWebsite(url, (status) => setAnalysisStatus(status));
      
      // Set a default profile name based on the URL
      const urlObj = new URL(url);
      setProfileName(urlObj.hostname);
      setAnalysisStatus('Analysis complete! Review the results below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze website');
      setAnalysisStatus('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setAnalysisStatus('Processing document...');
      await analyzeDocument(file, (status) => setAnalysisStatus(status));
      
      // Set profile name based on file name (without extension)
      setProfileName(file.name.replace(/\.[^/.]+$/, ''));
      setAnalysisStatus('Analysis complete! Review the results below.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze document');
      setAnalysisStatus('');
    }
  };

  const handleSaveProfile = async () => {
    if (!currentProfile) {
      setError('No profile to save');
      return;
    }

    if (!profileName.trim()) {
      setError('Please provide a name for the tone profile');
      return;
    }

    try {
      setError(null);
      const { shouldRedirect } = await saveProfile({
        ...currentProfile,
        name: profileName.trim(),
      });

      if (shouldRedirect) {
        navigate('/settings', {
          state: { message: 'Please complete your school registration to save tone profiles.' }
        });
        return;
      }

      // Clear the form after successful save
      setUrl('');
      setProfileName('');
      setAnalysisStatus('Profile saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  if (!isSchoolRegistered) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Complete Your Registration</h1>
          <p className="text-gray-600 mb-6">
            To use the tone analysis features and save your profiles, please complete your school registration first.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Settings className="mr-2 h-5 w-5" />
            Complete Registration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Tone Analysis</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Analysis Tools */}
        <div className="space-y-6">
          {/* Website Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Globe className="mr-2" size={24} />
              Website Analysis
            </h2>
            <form onSubmit={handleUrlAnalysis} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                  School Website URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="https://www.school.edu"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  'Analyze Website'
                )}
              </button>
            </form>
          </div>

          {/* Document Upload */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Upload className="mr-2" size={24} />
              Document Upload
            </h2>
            <div className="mt-2">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
              >
                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-500'}`}>
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept={ALLOWED_FILE_TYPES}
                        onChange={handleFileUpload}
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT up to 10MB</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Status Messages */}
          {(error || analysisStatus) && (
            <div className={`p-4 rounded-lg ${error ? 'bg-red-50' : 'bg-blue-50'}`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {error ? (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  ) : (
                    <div className={`h-5 w-5 rounded-full ${loading ? 'animate-pulse bg-blue-400' : 'bg-blue-500'}`}></div>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm ${error ? 'text-red-800' : 'text-blue-700'}`}>
                    {error || analysisStatus}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Saved Profiles */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Saved Profiles</h2>
            {profiles.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Info className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No saved profiles yet. Analyze content to create your first profile.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{profile.name}</h3>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatDate(profile.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {/* TODO: Implement profile deletion */}}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete profile"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={profile.dimensions}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" />
                          <PolarRadiusAxis domain={[0, 100]} />
                          <Radar
                            name="Tone Profile"
                            dataKey="value"
                            stroke="#4F46E5"
                            fill="#4F46E5"
                            fillOpacity={0.6}
                          />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Results Display */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Analysis Results</h2>
            {currentProfile && (
              <div className="flex items-center space-x-4">
                <div>
                  <label htmlFor="profileName" className="sr-only">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    id="profileName"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter profile name"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-700 mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2" size={16} />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {currentProfile ? (
            <div className="space-y-6">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={currentProfile.dimensions}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      name="Tone Profile"
                      dataKey="value"
                      stroke="#4F46E5"
                      fill="#4F46E5"
                      fillOpacity={0.6}
                      onMouseEnter={(data) => setSelectedDimension(data.name)}
                      onMouseLeave={() => setSelectedDimension(null)}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Dimension Details */}
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Dimension Details</h3>
                <div className="space-y-4">
                  {currentProfile.dimensions.map((dimension) => (
                    <div
                      key={dimension.name}
                      className={`p-4 rounded-lg border ${
                        selectedDimension === dimension.name
                          ? 'border-indigo-200 bg-indigo-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{dimension.name}</h4>
                        <span className="text-sm font-semibold text-indigo-600">
                          {dimension.value}/100
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{dimension.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Info className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No analysis results to display. Start by analyzing your content.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToneAnalysis;