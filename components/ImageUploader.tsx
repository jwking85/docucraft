import React, { useCallback } from 'react';
import { Upload, X, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react';
import { ProcessedImage } from '../types';

interface ImageUploaderProps {
  images: ProcessedImage[];
  setImages: React.Dispatch<React.SetStateAction<ProcessedImage[]>>;
  isAnalyzing: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ images, setImages, isAnalyzing }) => {
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as File[];
      const newImages: ProcessedImage[] = newFiles.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file),
        isAnalyzing: false,
        source: 'upload',
        mediaType: 'image'
      }));
      setImages(prev => [...prev, ...newImages]);
    }
  }, [setImages]);

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">1. Source Footage</h2>
        <span className="text-slate-400 text-sm">{images.length} items loaded</span>
      </div>

      <div className="relative border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors p-8 text-center group">
        <input 
          type="file" 
          multiple 
          accept="image/*" 
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isAnalyzing}
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 bg-slate-700 rounded-full group-hover:bg-slate-600 transition-colors">
            <Upload className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-200">Drop images here or click to upload</p>
            <p className="text-sm text-slate-500 mt-1">Supports JPG, PNG, WEBP</p>
          </div>
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
              <img 
                src={img.previewUrl} 
                alt="preview" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
              />
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {!isAnalyzing && (
                  <button 
                    onClick={() => removeImage(img.id)}
                    className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white backdrop-blur-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Analysis Status Indicator */}
              <div className="absolute bottom-2 right-2">
                {img.analysis ? (
                   <div className="bg-green-500 text-white p-1 rounded-full shadow-lg" title="Analyzed">
                     <CheckCircle className="w-3 h-3" />
                   </div>
                ) : isAnalyzing ? (
                   <div className="bg-blue-500 text-white p-1 rounded-full shadow-lg animate-spin">
                     <Loader2 className="w-3 h-3" />
                   </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;