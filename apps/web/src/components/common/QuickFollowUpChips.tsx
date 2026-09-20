import React from 'react';
import { Zap, X } from 'lucide-react';
import { FOLLOW_UP_PRESETS, isPresetInText, togglePresetInText } from '../../utils/followUpPresets';

interface QuickFollowUpChipsProps {
  value: string;
  onChange: (newValue: string) => void;
  label?: string;
  className?: string;
}

export const QuickFollowUpChips: React.FC<QuickFollowUpChipsProps> = ({
  value,
  onChange,
  label = 'Quick Follow-up Presets (Click to add / combine):',
  className = ''
}) => {
  const handlePresetClick = (preset: string) => {
    const updated = togglePresetInText(value, preset);
    onChange(updated);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <Zap size={11} className="text-amber-500 fill-amber-500" />
          <span>{label}</span>
        </label>
        {value && value.trim().length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] font-bold text-gray-400 hover:text-red-500 flex items-center gap-0.5 transition-colors"
            title="Clear all messages"
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
        {FOLLOW_UP_PRESETS.map((preset) => {
          const selected = isPresetInText(value, preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 flex items-center gap-1 select-none cursor-pointer ${
                selected
                  ? 'bg-brand text-white border-brand font-bold shadow-xs scale-[1.02]'
                  : 'bg-gray-50 hover:bg-gray-100/90 text-gray-700 border-gray-200 hover:border-gray-300 font-medium'
              }`}
            >
              <span className={`text-[10px] font-black ${selected ? 'text-white' : 'text-gray-400'}`}>
                {selected ? '✓' : '+'}
              </span>
              <span>{preset}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickFollowUpChips;
