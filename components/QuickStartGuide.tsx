import React, { useState, useEffect } from 'react';
import { X, Sparkles, Mic, Film, Upload, Scissors, Music as MusicIcon, Palette } from 'lucide-react';

interface QuickStartGuideProps {
  onClose: () => void;
}

const QuickStartGuide: React.FC<QuickStartGuideProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
      title: 'Welcome to DocuCraft!',
      description: 'Create professional YouTube documentaries in 30 minutes',
      tips: [
        '✨ AI-powered scene generation',
        '🎬 Professional templates included',
        '🎙️ Built-in voice recording',
        '📱 One-click social media exports'
      ]
    },
    {
      icon: <Upload className="w-8 h-8 text-blue-400" />,
      title: 'Step 1: Add Your Script',
      description: 'Paste your documentary script in the Workspace',
      tips: [
        'Click "Enhance Script (AI)" to add context',
        'AI will fact-check and improve your content',
        'Then click "Analyze & Visualize"'
      ]
    },
    {
      icon: <Mic className="w-8 h-8 text-purple-400" />,
      title: 'Step 2: Add Voiceover',
      description: 'Record narration directly in the app',
      tips: [
        'Click "Record" to use built-in recorder',
        'Or upload your own audio file',
        'Or use "AI Narrator" for text-to-speech'
      ]
    },
    {
      icon: <Palette className="w-8 h-8 text-pink-400" />,
      title: 'Step 3: Apply Template',
      description: 'Choose a professional documentary style',
      tips: [
        '📜 Historical - Warm, nostalgic feel',
        '🌿 Nature - Cinematic landscapes',
        '🔍 True Crime - Dramatic, dark mood',
        '8 templates total - instant styling!'
      ]
    },
    {
      icon: <Scissors className="w-8 h-8 text-green-400" />,
      title: 'Step 4: Add Media',
      description: 'Upload images or videos for each scene',
      tips: [
        'Upload videos → Auto-opens trimmer',
        'Trim to exact clip you need',
        'Upload images → Ken Burns effect auto-applied',
        'Or click "Pro" for AI-generated images'
      ]
    },
    {
      icon: <MusicIcon className="w-8 h-8 text-indigo-400" />,
      title: 'Step 5: Add Music (Optional)',
      description: 'Background music with auto-ducking',
      tips: [
        'Upload royalty-free music',
        'Auto-ducking lowers music during narration',
        'Set volume to 10-20% recommended',
        'Fade in/out controls included'
      ]
    },
    {
      icon: <Film className="w-8 h-8 text-red-400" />,
      title: 'Step 6: Export',
      description: 'One-click export for any platform',
      tips: [
        '📺 YouTube - 1080p Full HD',
        '📱 Shorts - Vertical format',
        '✨ 4K - Premium quality',
        '⚡ Fast - Quick 720p exports'
      ]
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              {currentStepData.icon}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                {currentStepData.title}
              </h2>
              <p className="text-sm text-indigo-100">
                {currentStepData.description}
              </p>
            </div>
          </div>
          <div className="flex gap-1 mt-3">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-white'
                    : index < currentStep
                    ? 'bg-white/50'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <ul className="space-y-3">
            {currentStepData.tips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-slate-300 text-sm animate-in slide-in-from-left"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="text-indigo-400 font-bold mt-0.5">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-700 flex justify-between items-center">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <span className="text-xs text-slate-500 font-mono">
            {currentStep + 1} / {steps.length}
          </span>

          {isLastStep ? (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg"
            >
              Get Started! 🚀
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
              className="px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Next →
            </button>
          )}
        </div>

        {/* Skip option */}
        <div className="px-4 pb-3 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickStartGuide;
