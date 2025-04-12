/**
 * Content Creation page component
 * Implements AI-powered content generation with tone matching
 */

import React from 'react';
import { FileText, Save, RefreshCw } from 'lucide-react';
import { useToneStore } from '../stores/toneStore';
import { model } from '../lib/gemini';

function ContentCreation() {
  const [prompt, setPrompt] = React.useState('');
  const [content, setContent] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState('');
  const { profiles, loadProfiles } = useToneStore();
  const [selectedProfile, setSelectedProfile] = React.useState('');

  React.useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleGenerate = async () => {
    if (!prompt || !selectedProfile) {
      setError('Please provide a prompt and select a tone profile');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const profile = profiles.find(p => p.id === selectedProfile);
      const toneGuidelines = profile?.dimensions
        .map(d => `${d.name}: ${d.value}/100 - ${d.description}`)
        .join('\n');

      const promptWithTone = `
        Generate content following these tone guidelines:
        ${toneGuidelines}

        Content prompt:
        ${prompt}

        Generate content that matches these tone characteristics while addressing the prompt.
      `;

      const result = await model.generateContent(promptWithTone);
      const response = await result.response;
      setContent(response.text());
    } catch (err) {
      setError('Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center mb-8">
        <FileText className="h-8 w-8 text-indigo-600 mr-3" />
        <h1 className="text-3xl font-bold text-gray-900">Content Creation</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Generate Content</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tone Profile
                </label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select a tone profile</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What would you like to create?
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="E.g., Write a welcome message for new students..."
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
              >
                {generating ? (
                  <>
                    <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                    Generating...
                  </>
                ) : (
                  'Generate Content'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Generated Content</h2>
            <button
              onClick={() => {/* TODO: Implement save functionality */}}
              disabled={!content}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </button>
          </div>

          {content ? (
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap">{content}</div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
              Generated content will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContentCreation;