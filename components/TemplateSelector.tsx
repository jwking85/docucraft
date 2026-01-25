import React, { useState } from 'react';
import { Sparkles, Check, Info } from 'lucide-react';
import { TimelineScene } from '../types';
import { DOCUMENTARY_TEMPLATES, applyTemplate, recommendTemplate, DocumentaryTemplate } from '../services/advancedTemplates';

interface TemplateSelectorProps {
  timeline: TimelineScene[];
  scriptText: string;
  onApplyTemplate: (updatedTimeline: TimelineScene[]) => void;
  onError: (msg: string) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  timeline,
  scriptText,
  onApplyTemplate,
  onError
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);

  const recommended = scriptText ? recommendTemplate(scriptText) : null;

  const handleApply = (templateId: string) => {
    if (timeline.length === 0) {
      onError('No scenes to apply template to. Create scenes first.');
      return;
    }

    const template = DOCUMENTARY_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    if (confirm(`Apply "${template.name}" template to all ${timeline.length} scenes?\n\n${template.description}\n\nThis will apply professional filters, motion, and pacing instantly.`)) {
      const updated = applyTemplate(timeline, templateId);
      onApplyTemplate(updated);
      setSelectedTemplate(templateId);
      onError(`✅ Applied ${template.name} template successfully!`);
    }
  };

  const TemplateCard = ({ template }: { template: DocumentaryTemplate }) => {
    const isSelected = selectedTemplate === template.id;
    const isRecommended = recommended?.id === template.id;
    const isPreviewing = showPreview === template.id;

    return (
      <div
        className={`relative p-4 rounded-lg border transition-all ${
          isSelected
            ? 'bg-gradient-to-br from-indigo-600 to-purple-600 border-indigo-500 shadow-lg shadow-indigo-900/50'
            : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
        }`}
      >
        {isRecommended && (
          <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
            <Sparkles className="w-3 h-3" />
            AI Pick
          </div>
        )}

        {isSelected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
            <Check className="w-3 h-3 text-indigo-600" />
          </div>
        )}

        <div className="text-3xl mb-2">{template.icon}</div>

        <div className={`text-sm font-bold mb-1 ${isSelected ? 'text-white' : 'text-slate-200'}`}>
          {template.name}
        </div>

        <div className={`text-xs mb-3 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
          {template.description}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleApply(template.id)}
            disabled={timeline.length === 0}
            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-all ${
              isSelected
                ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSelected ? 'Applied ✓' : 'Apply'}
          </button>

          <button
            onClick={() => setShowPreview(isPreviewing ? null : template.id)}
            className={`px-3 py-2 rounded text-xs font-medium transition-all ${
              isSelected
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
            }`}
          >
            <Info className="w-3 h-3" />
          </button>
        </div>

        {isPreviewing && (
          <div className={`mt-3 pt-3 border-t ${isSelected ? 'border-white/20' : 'border-slate-700'}`}>
            <div className="text-[10px] space-y-2">
              <div>
                <div className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>Style:</div>
                <div className={isSelected ? 'text-indigo-100' : 'text-slate-400'}>
                  • Filter: {template.style.defaultFilter}<br />
                  • Motion: {template.style.defaultMotion}<br />
                  • Pacing: {template.style.pacing} ({
                    template.style.pacing === 'fast' ? '3-5s' :
                    template.style.pacing === 'slow' ? '8-12s' : '6-8s'
                  } scenes)
                </div>
              </div>

              <div>
                <div className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-300'}`}>Best For:</div>
                <div className={isSelected ? 'text-indigo-100' : 'text-slate-400'}>
                  {template.exampleUse}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-gradient-to-br from-violet-950/30 to-fuchsia-950/30 rounded-xl border border-violet-900/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-violet-300 uppercase tracking-wide">
            Professional Templates
          </h3>
        </div>
        {selectedTemplate && (
          <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded border border-violet-500/30">
            Template active
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
        One-click professional styling. AI analyzes your script to recommend the best template.
      </p>

      {recommended && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-semibold text-yellow-300 mb-1">
                AI Recommendation: {recommended.name}
              </div>
              <div className="text-yellow-400/80">
                Based on your script content, this template will give you the best results.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {DOCUMENTARY_TEMPLATES.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      <div className="mt-4 text-[10px] text-slate-500 space-y-1 bg-slate-900/40 p-3 rounded">
        <div className="font-semibold text-slate-400 mb-2">What templates do:</div>
        <div className="flex items-center gap-1">
          <span className="text-violet-400">✓</span>
          <span>Apply cinematic filters (vintage, dramatic, noir, etc.)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-violet-400">✓</span>
          <span>Set optimal camera motion (zoom, pan, static)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-violet-400">✓</span>
          <span>Adjust pacing for retention (fast/medium/slow)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-violet-400">✓</span>
          <span>Professional look in 1 click (normally takes hours)</span>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;
