export type JobStatus =
  | 'Applied'
  | 'Shortlisted'
  | 'Interviewing'
  | 'Offered'
  | 'Rejected'
  | 'Ghosted';

export type RoleType = 'Full-time' | 'Part-time' | 'Internship' | 'Contract';

export type CompensationPeriod = 'Annual' | 'Monthly';

export type LocationType = 'On-site' | 'Remote' | 'Hybrid';

export interface JobApplication {
  id: string;
  user_id: string;
  date_of_application: string;
  company_name: string;
  role: string;
  industry: string;
  ctc: string;
  compensation_period: CompensationPeriod | '';
  role_type: RoleType;
  location_type: LocationType;
  location_city: string;
  resume_file_name: string;
  resume_url: string;
  jd_url: string;
  jd_text: string;
  personal_note: string;
  status: JobStatus;
  follow_up_date: string;
  follow_up_done: boolean;
  created_at: string;
}

export type JobInput = Omit<JobApplication, 'id' | 'created_at' | 'user_id'>;

export type SortOption =
  | 'date-desc'
  | 'date-asc'
  | 'company-asc'
  | 'company-desc';

export type StatusFilter = JobStatus | 'All';

// ── Watchlist ──────────────────────────────────────────────────────────────

/** A watchlist entry is either a whole company or a specific job posting. */
export type WatchlistKind = 'Company' | 'Job';

export interface WatchlistCompany {
  id: string;
  user_id: string;
  kind: WatchlistKind;
  company_name: string;
  /** Job title — only meaningful when kind === 'Job'. */
  role: string;
  industry: string;
  website_url: string;
  location: string;
  note: string;
  created_at: string;
}

export type WatchlistInput = Omit<
  WatchlistCompany,
  'id' | 'created_at' | 'user_id'
>;

export const STATUS_OPTIONS: JobStatus[] = [
  'Applied',
  'Shortlisted',
  'Interviewing',
  'Offered',
  'Rejected',
  'Ghosted',
];

export const ROLE_TYPE_OPTIONS: RoleType[] = [
  'Full-time',
  'Part-time',
  'Internship',
];

export const COMPENSATION_PERIOD_OPTIONS: CompensationPeriod[] = [
  'Annual',
  'Monthly',
];

export const LOCATION_TYPE_OPTIONS: LocationType[] = [
  'Remote',
  'Hybrid',
  'On-site',
];

// City autocomplete suggestions. Free-text entry is still allowed —
// this list just powers the suggestion dropdown.
// Aliases let users search by either name (e.g. typing "bang" finds Bengaluru)
// while the saved value remains the primary name.
export interface CitySuggestion {
  name: string;
  aliases?: string[];
}

export const CITY_SUGGESTIONS: CitySuggestion[] = [
  // ── Tier 1 metros ──
  { name: 'Mumbai' },
  { name: 'Delhi' },
  { name: 'New Delhi' },
  { name: 'Noida' },
  { name: 'Gurugram', aliases: ['Gurgaon'] },
  { name: 'Faridabad' },
  { name: 'Ghaziabad' },
  { name: 'Bengaluru', aliases: ['Bangalore'] },
  { name: 'Hyderabad' },
  { name: 'Chennai' },
  { name: 'Kolkata' },
  { name: 'Ahmedabad' },
  { name: 'Pune' },

  // ── North India ──
  // Uttar Pradesh
  { name: 'Lucknow' },
  { name: 'Kanpur' },
  { name: 'Agra' },
  { name: 'Varanasi' },
  { name: 'Prayagraj', aliases: ['Allahabad'] },
  { name: 'Meerut' },
  // Punjab & Haryana
  { name: 'Chandigarh' },
  { name: 'Ludhiana' },
  { name: 'Amritsar' },
  { name: 'Jalandhar' },
  { name: 'Ambala' },
  // Rajasthan
  { name: 'Jaipur' },
  { name: 'Jodhpur' },
  { name: 'Udaipur' },
  { name: 'Kota' },
  { name: 'Bikaner' },
  // Madhya Pradesh
  { name: 'Indore' },
  { name: 'Bhopal' },
  { name: 'Gwalior' },
  { name: 'Jabalpur' },
  // Uttarakhand & Himachal
  { name: 'Dehradun' },
  { name: 'Shimla' },

  // ── West India ──
  // Gujarat
  { name: 'Surat' },
  { name: 'Vadodara' },
  { name: 'Rajkot' },
  { name: 'Bhavnagar' },
  // Maharashtra
  { name: 'Nagpur' },
  { name: 'Nashik' },
  { name: 'Chhatrapati Sambhajinagar', aliases: ['Aurangabad'] },
  { name: 'Solapur' },
  { name: 'Kolhapur' },
  // Goa
  { name: 'Panaji' },
  { name: 'Margao' },

  // ── South India ──
  // Karnataka
  { name: 'Mysuru', aliases: ['Mysore'] },
  { name: 'Hubli-Dharwad' },
  { name: 'Mangaluru', aliases: ['Mangalore'] },
  { name: 'Belagavi' },
  // Tamil Nadu
  { name: 'Coimbatore' },
  { name: 'Madurai' },
  { name: 'Tiruchirappalli', aliases: ['Trichy'] },
  { name: 'Salem' },
  { name: 'Tiruppur' },
  // Kerala
  { name: 'Kochi' },
  { name: 'Thiruvananthapuram', aliases: ['Trivandrum'] },
  { name: 'Kozhikode', aliases: ['Calicut'] },
  { name: 'Thrissur' },
  // Andhra Pradesh
  { name: 'Visakhapatnam', aliases: ['Vizag'] },
  { name: 'Vijayawada' },
  { name: 'Guntur' },
  { name: 'Nellore' },
  { name: 'Tirupati' },

  // ── East & Northeast ──
  // Bihar & Jharkhand
  { name: 'Patna' },
  { name: 'Gaya' },
  { name: 'Muzaffarpur' },
  { name: 'Ranchi' },
  { name: 'Jamshedpur' },
  { name: 'Dhanbad' },
  // Odisha
  { name: 'Bhubaneswar' },
  { name: 'Cuttack' },
  { name: 'Rourkela' },
  // West Bengal
  { name: 'Asansol' },
  { name: 'Siliguri' },
  { name: 'Durgapur' },
  // Northeast
  { name: 'Guwahati' },
  { name: 'Agartala' },
  { name: 'Imphal' },
  { name: 'Shillong' },
  { name: 'Aizawl' },
];
