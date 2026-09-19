export interface RatingOption {
  value: number;
  label: string;
  ratingName: string;
  color: string;
  badgeBg: string;
  textColor: string;
}

export const RATING_OPTIONS: RatingOption[] = [
  { 
    value: 1, 
    label: '1 - Disqualified', 
    ratingName: 'DISQUALIFIED', 
    color: '#ef4444',
    badgeBg: 'bg-red-50 border-red-200',
    textColor: 'text-red-700'
  },
  { 
    value: 2, 
    label: '2 - Low Quality', 
    ratingName: 'LOW_QUALITY', 
    color: '#f97316',
    badgeBg: 'bg-orange-50 border-orange-200',
    textColor: 'text-orange-700'
  },
  { 
    value: 3, 
    label: '3 - Moderate', 
    ratingName: 'MODERATE', 
    color: '#eab308',
    badgeBg: 'bg-amber-50 border-amber-200',
    textColor: 'text-amber-700'
  },
  { 
    value: 4, 
    label: '4 - Qualified', 
    ratingName: 'QUALIFIED', 
    color: '#3b82f6',
    badgeBg: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-700'
  },
  { 
    value: 5, 
    label: '5 - Order Booked', 
    ratingName: 'ORDER_BOOKED', 
    color: '#10b981',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    textColor: 'text-emerald-700'
  },
];

export const getRatingOption = (rating?: number | null, ratingName?: string | null): RatingOption | undefined => {
  if (rating !== undefined && rating !== null && Number(rating) > 0) {
    const found = RATING_OPTIONS.find((opt) => opt.value === Number(rating));
    if (found) return found;
  }
  if (ratingName) {
    const normalized = ratingName.toUpperCase().replace(/[\s-]/g, '_');
    const found = RATING_OPTIONS.find((opt) => opt.ratingName === normalized);
    if (found) return found;
  }
  return undefined;
};

export const getRatingLabel = (rating?: number | null, ratingName?: string | null): string => {
  const opt = getRatingOption(rating, ratingName);
  if (opt) return opt.label;
  if (rating && Number(rating) > 0) return `${rating} - Rated`;
  return 'Not Rated';
};

export const getRatingName = (rating: number): string => {
  return RATING_OPTIONS.find((option) => option.value === Number(rating))?.ratingName || '';
};
