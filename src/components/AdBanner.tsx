import React from 'react';

interface AdBannerProps {
  format?: 'leaderboard' | 'rectangle' | 'responsive' | 'mobile-banner';
  className?: string;
  slotId?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  format = 'responsive',
  className = '',
  slotId = 'gamescrafter-ad-slot'
}) => {
  return (
    <div className={`my-4 flex flex-col items-center justify-center ${className}`}>
      {/* Discreet Ad Tag */}
      <span className="text-[9px] tracking-widest text-slate-500 font-mono uppercase mb-1">
        Sponsored Advertisement
      </span>

      {/* Ad Container Box */}
      {format === 'leaderboard' && (
        <div 
          id={slotId}
          className="w-full max-w-[728px] h-[90px] bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-center text-slate-500 text-xs font-mono overflow-hidden"
        >
          <div className="text-center p-2">
            <span className="text-cyan-500/80 font-bold">GamesCrafter Partner Network</span>
            <p className="text-[10px] text-slate-400">728x90 AdSense Ready Slot</p>
          </div>
        </div>
      )}

      {format === 'rectangle' && (
        <div 
          id={slotId}
          className="w-[300px] h-[250px] bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-center text-slate-500 text-xs font-mono overflow-hidden"
        >
          <div className="text-center p-4">
            <span className="text-cyan-500/80 font-bold">GamesCrafter Partner Network</span>
            <p className="text-[10px] text-slate-400 mt-1">300x250 Medium Rectangle Slot</p>
          </div>
        </div>
      )}

      {format === 'mobile-banner' && (
        <div 
          id={slotId}
          className="w-full max-w-[320px] h-[50px] bg-slate-900/60 border border-slate-800/80 rounded-lg flex items-center justify-center text-slate-500 text-xs font-mono overflow-hidden"
        >
          <div className="text-center p-1">
            <span className="text-cyan-400/80 text-[10px] font-bold">AdSense 320x50 Mobile Slot</span>
          </div>
        </div>
      )}

      {format === 'responsive' && (
        <div 
          id={slotId}
          className="w-full max-w-4xl py-3 px-4 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-center justify-between flex-wrap gap-2 text-slate-400 text-xs font-mono"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-slate-300 font-bold text-xs">GamesCrafter Ad Space</span>
          </div>
          <span className="text-[11px] text-slate-400">Compatible with Google AdSense & Direct Sponsors</span>
        </div>
      )}
    </div>
  );
};
