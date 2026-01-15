import React from 'react';
import { ImageAnalysis, ProcessedImage } from '../types';
import { Tag, MapPin, Smile, Film } from 'lucide-react';

interface AnalysisViewProps {
  images: ProcessedImage[];
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ images }) => {
  const analyzedImages = images.filter(img => img.analysis);

  if (analyzedImages.length === 0) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <h3 className="text-sm uppercase tracking-wider text-slate-500 font-semibold">Pass 1: Visual Intelligence</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analyzedImages.map((img) => (
          <div key={img.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
            <div className="h-48 overflow-hidden relative">
              <img src={img.previewUrl} alt="preview" className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-mono text-white">
                {img.analysis?.filename}
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-3">
              <div>
                <p className="text-slate-100 font-medium line-clamp-1">{img.analysis?.short_caption}</p>
                <p className="text-slate-400 text-xs mt-1 line-clamp-2">{img.analysis?.detailed_caption}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {img.analysis?.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" /> {tag}
                  </span>
                ))}
                {(img.analysis?.tags.length || 0) > 4 && (
                  <span className="text-[10px] px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded-full">
                    +{ (img.analysis?.tags.length || 0) - 4 } more
                  </span>
                )}
              </div>

              <div className="mt-auto pt-3 border-t border-slate-700 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 text-xs text-blue-300">
                   <Film className="w-3 h-3" />
                   <span className="capitalize">{img.analysis?.best_sections}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-amber-300">
                   <Smile className="w-3 h-3" />
                   <span className="capitalize">{img.analysis?.mood}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisView;