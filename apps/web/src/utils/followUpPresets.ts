export const FOLLOW_UP_PRESETS = [
  'Shared brochure',
  'Visited',
  'Waiting for selection',
  'Need to share the estimation',
  'Waiting for resp',
  'No req ( amt bit high )',
  'Call not answered',
  'Asked for callback',
  'Discussion in progress',
  'Site visit planned'
] as const;

export type FollowUpPreset = typeof FOLLOW_UP_PRESETS[number];

/**
 * Checks whether a given preset is currently present in the text string (case-insensitive)
 */
export const isPresetInText = (text: string, preset: string): boolean => {
  if (!text) return false;
  const segments = text
    .split(/\s*[/|]\s*|\n+/)
    .map(s => s.trim().toLowerCase());
  return segments.includes(preset.toLowerCase());
};

/**
 * Toggles a preset into or out of the current text string separated by ' / '
 */
export const togglePresetInText = (text: string, preset: string): string => {
  const current = (text || '').trim();
  const segments = current
    ? current.split(/\s*[/|]\s*|\n+/).map(s => s.trim()).filter(Boolean)
    : [];

  const index = segments.findIndex(s => s.toLowerCase() === preset.toLowerCase());
  if (index >= 0) {
    // If already present, clicking again toggles it off
    segments.splice(index, 1);
  } else {
    // If not present, append it to the existing messages
    segments.push(preset);
  }

  return segments.join(' / ');
};
