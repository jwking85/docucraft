import React, { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage
    const storedApiKey = localStorage.getItem('docucraft_gemini_key') || '';
    const storedPexelsKey = localStorage.getItem('docucraft_pexels_key') || '';
    const storedAccessCode = localStorage.getItem('docucraft_access_code') || '';

    setApiKey(storedApiKey);
    setPexelsKey(storedPexelsKey);
    setAccessCode(storedAccessCode);
  }, []);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('docucraft_gemini_key', apiKey);
    localStorage.setItem('docucraft_pexels_key', pexelsKey);
    localStorage.setItem('docucraft_access_code', accessCode);

    // Update process.env (for current session)
    (process.env as any).API_KEY = apiKey;
    (process.env as any).GEMINI_API_KEY = apiKey;
    (process.env as any).PEXELS_API_KEY = pexelsKey;
    (process.env as any).ACCESS_CODE = accessCode;

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestKey = async () => {
    if (!apiKey) {
      alert('Please enter a Gemini API key first');
      return;
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: { parts: [{ text: 'Say "API key works!"' }] }
      });

      if (response.text) {
        alert('✅ API Key is valid and working!');
      } else {
        alert('⚠️ API Key responded but may have issues');
      }
    } catch (error: any) {
      alert(`❌ API Key test failed: ${error.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-slate-900 to-slate-800 p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">API Settings</h2>
                <p className="text-xs text-slate-400">Configure your API keys for AI features</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Gemini API Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                Google AI Studio API Key
              </label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showKeys ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none pr-24"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button
                  onClick={() => setShowKeys(!showKeys)}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title={showKeys ? 'Hide keys' : 'Show keys'}
                >
                  {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleTestKey}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors"
                >
                  Test
                </button>
              </div>
            </div>

            <div className="bg-blue-950/30 border border-blue-900/30 rounded-lg p-3 text-xs text-blue-300">
              <div className="font-semibold mb-1">Required for:</div>
              <ul className="space-y-0.5 text-blue-400">
                <li>• Script analysis and scene generation</li>
                <li>• AI voiceover generation</li>
                <li>• Auto-captioning</li>
                <li>• AI recommendations</li>
              </ul>
            </div>
          </div>

          {/* Pexels API Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-400" />
                Pexels API Key
              </label>
              <a
                href="https://www.pexels.com/api/new/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              type={showKeys ? 'text' : 'password'}
              value={pexelsKey}
              onChange={(e) => setPexelsKey(e.target.value)}
              placeholder="Optional - for better stock photos"
              className="w-full bg-black/40 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />

            <div className="bg-purple-950/30 border border-purple-900/30 rounded-lg p-3 text-xs text-purple-300">
              <div className="font-semibold mb-1">Optional (Free):</div>
              <ul className="space-y-0.5 text-purple-400">
                <li>• Improves AI image generation quality</li>
                <li>• Better keyword matching for stock photos</li>
                <li>• Free tier: 200 requests/hour</li>
              </ul>
            </div>
          </div>

          {/* Access Code */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Key className="w-4 h-4 text-green-400" />
              Access Code
            </label>

            <input
              type={showKeys ? 'text' : 'password'}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Optional - for password protection"
              className="w-full bg-black/40 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />

            <div className="bg-green-950/30 border border-green-900/30 rounded-lg p-3 text-xs text-green-300">
              Set a password to lock DocuCraft access
            </div>
          </div>

          {/* Save Status */}
          {saved && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 p-3 rounded-lg border border-green-700/30 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved successfully! Refresh to apply changes.
            </div>
          )}

          {/* Warning */}
          <div className="bg-amber-950/30 border border-amber-900/30 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Security Note:</div>
              <div className="text-amber-400">
                API keys are stored in your browser's localStorage. Never share your keys with others.
                For production deployment, use environment variables instead.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 p-6 border-t border-slate-700 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Settings
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
