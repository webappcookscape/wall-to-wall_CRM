/**
 * Parses and separates siteLocation, requirement, and clean follow-up comments/messages from a lead.
 * This completely prevents site location from getting merged with follow-up messages or presets.
 */
export function parseLeadLocationAndComments(
  comments?: string | null,
  explicitLocation?: string | null,
  explicitRequirement?: string | null
): {
  siteLocation: string | null;
  requirement: string | null;
  cleanComments: string;
  commentSegments: string[];
} {
  let siteLocation = explicitLocation?.trim() || null;
  let requirement = explicitRequirement?.trim() || null;
  let cleanComments = (comments || '').trim();

  // 1. Extract and separate Location if present in comments
  if (cleanComments) {
    const locMatch = cleanComments.match(/Location:\s*([^|\n]+)/i);
    if (locMatch) {
      const fullLocString = locMatch[1].trim();

      // Check if location string accidentally contains a follow-up preset or message separated by '/'
      if (fullLocString.includes('/')) {
        const parts = fullLocString.split(/\s*\/\s*/);
        if (!siteLocation) {
          siteLocation = parts[0]?.trim() || null;
        }
        // The remaining segment(s) are follow-up messages (e.g. "Waiting for resp")
        const followUpPart = parts.slice(1).join(' / ').trim();
        cleanComments = cleanComments.replace(
          locMatch[0],
          followUpPart ? ` | ${followUpPart}` : ''
        );
      } else {
        if (!siteLocation) {
          siteLocation = fullLocString || null;
        }
        cleanComments = cleanComments.replace(locMatch[0], '');
      }
    }
  }

  // 2. Extract Requirement if present in comments
  if (cleanComments) {
    const reqMatch = cleanComments.match(/Requirement:\s*([^|\n]+)/i);
    if (reqMatch) {
      const fullReqString = reqMatch[1].trim();
      if (!requirement) {
        requirement = fullReqString || null;
      }
      cleanComments = cleanComments.replace(reqMatch[0], '');
    }
  }

  // 3. Clean leading/trailing pipes, slashes, or whitespace
  cleanComments = cleanComments
    .replace(/^(\s*\|\s*|\s*\/\s*)+|(\s*\|\s*|\s*\/\s*)+$/g, '')
    .replace(/\s*\|\s*\|\s*/g, ' | ')
    .trim();

  // 4. Split clean comments into segments for structured display
  const commentSegments = cleanComments
    ? cleanComments.split(/\s*[/|]\s*|\n+/).map(s => s.trim()).filter(Boolean)
    : [];

  return {
    siteLocation,
    requirement,
    cleanComments,
    commentSegments,
  };
}
