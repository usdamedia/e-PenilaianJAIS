import React, { useRef } from 'react';
import { X, Loader2 } from 'lucide-react';

interface CameraOverlayProps {
  isOpen: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onCapture: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({
  isOpen,
  isProcessing,
  onClose,
  onCapture,
  videoRef,
  canvasRef,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/70 to-transparent">
        <h3 className="text-white font-bold text-lg">Imbas Info Program</h3>
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white backdrop-blur-md">
          <X size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover"
        />
        {/* Guide Frame */}
        <div className="absolute inset-8 border-2 border-lime-400/50 rounded-3xl pointer-events-none flex flex-col justify-between p-4">
          <div className="flex justify-between">
            <div className="w-8 h-8 border-t-4 border-l-4 border-lime-400 rounded-tl-xl"></div>
            <div className="w-8 h-8 border-t-4 border-r-4 border-lime-400 rounded-tr-xl"></div>
          </div>
          <div className="text-center">
            {isProcessing && (
              <div className="bg-black/60 text-white px-4 py-2 rounded-xl backdrop-blur-md inline-flex items-center gap-2">
                <Loader2 className="animate-spin text-lime-400" size={20}/> Memproses...
              </div>
            )}
          </div>
          <div className="flex justify-between">
            <div className="w-8 h-8 border-b-4 border-l-4 border-lime-400 rounded-bl-xl"></div>
            <div className="w-8 h-8 border-b-4 border-r-4 border-lime-400 rounded-br-xl"></div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="p-8 bg-black flex justify-center items-center pb-12">
        <button 
          onClick={onCapture}
          disabled={isProcessing}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/10 active:scale-95 transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-white"></div>
        </button>
      </div>
      
      {/* Hidden Canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
