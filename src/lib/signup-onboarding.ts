/** Jobber-style signup wizard: step metadata and option lists. */

export const SIGNUP_WIZARD_DRAFT_KEY = "signup-wizard-draft";

export const SIGNUP_STEP_COUNT = 10;

export type SignupStepId =
  | "credentials"
  | "name"
  | "phone"
  | "company"
  | "industry"
  | "team_size"
  | "years_in_business"
  | "goals"
  | "referral"
  | "revenue";

export const SIGNUP_STEPS: {
  id: SignupStepId;
  index: number;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "credentials",
    index: 1,
    title: "Create your account",
    subtitle: "Start your free trial - no credit card required.",
  },
  {
    id: "name",
    index: 2,
    title: "What's your name?",
    subtitle: "We'll use this on estimates and invoices you send.",
  },
  {
    id: "phone",
    index: 3,
    title: "What's your phone number?",
    subtitle: "Optional, but helpful for client follow-ups.",
  },
  {
    id: "company",
    index: 4,
    title: "What's your company called?",
    subtitle: "This appears on quotes, invoices, and your Client Hub.",
  },
  {
    id: "industry",
    index: 5,
    title: "What industry are you in?",
    subtitle: "We'll tailor defaults to your trade.",
  },
  {
    id: "team_size",
    index: 6,
    title: "How big is your team?",
    subtitle: "Include yourself and anyone who needs CRM access.",
  },
  {
    id: "years_in_business",
    index: 7,
    title: "How long have you been in business?",
    subtitle: "Helps us recommend the right setup path.",
  },
  {
    id: "goals",
    index: 8,
    title: "What do you want to accomplish?",
    subtitle: "Select all that apply.",
  },
  {
    id: "referral",
    index: 9,
    title: "How did you hear about us?",
    subtitle: "Thanks - this helps us improve.",
  },
  {
    id: "revenue",
    index: 10,
    title: "What's your estimated annual revenue?",
    subtitle: "Optional - skip if you prefer.",
  },
];

export const INDUSTRIES = [
  "General Contractor",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Landscaping",
  "Roofing",
  "Painting",
  "Flooring",
  "Carpentry",
  "Cleaning",
  "Pest Control",
  "Pool & Spa",
  "Handyman",
  "Garage Door",
  "Windows & Doors",
  "Concrete & Masonry",
  "Fencing",
  "Irrigation",
  "Appliance Repair",
  "Other",
] as const;

export type TeamSize = "solo" | "2-5" | "6-10" | "11-15" | "16+";

export const TEAM_SIZE_OPTIONS: { value: TeamSize; label: string; hint: string }[] = [
  { value: "solo", label: "Just me", hint: "Solo operator" },
  { value: "2-5", label: "2–5 people", hint: "Small crew" },
  { value: "6-10", label: "6–10 people", hint: "Growing team" },
  { value: "11-15", label: "11–15 people", hint: "Established team" },
  { value: "16+", label: "16+ people", hint: "Larger operation" },
];

export type YearsInBusiness = "lt1" | "1-3" | "3-5" | "5-10" | "10+";

export const YEARS_IN_BUSINESS_OPTIONS: { value: YearsInBusiness; label: string }[] = [
  { value: "lt1", label: "Less than 1 year" },
  { value: "1-3", label: "1–3 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "5-10", label: "5–10 years" },
  { value: "10+", label: "10+ years" },
];

export type PrimaryGoal =
  | "scheduling"
  | "quoting"
  | "invoicing"
  | "payments"
  | "team"
  | "marketing"
  | "other";

export const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: "scheduling", label: "Schedule jobs & crews" },
  { value: "quoting", label: "Send professional quotes" },
  { value: "invoicing", label: "Invoice and get paid faster" },
  { value: "payments", label: "Accept online payments" },
  { value: "team", label: "Manage my team" },
  { value: "marketing", label: "Grow my business" },
  { value: "other", label: "Something else" },
];

export type ReferralSource =
  | "google_search"
  | "social_media"
  | "friend_referral"
  | "trade_show"
  | "youtube"
  | "podcast"
  | "other";

export const REFERRAL_SOURCE_OPTIONS: { value: ReferralSource; label: string }[] = [
  { value: "google_search", label: "Google search" },
  { value: "social_media", label: "Social media" },
  { value: "friend_referral", label: "Friend or colleague" },
  { value: "trade_show", label: "Trade show or event" },
  { value: "youtube", label: "YouTube" },
  { value: "podcast", label: "Podcast" },
  { value: "other", label: "Other" },
];

export type EstimatedRevenue =
  | "under_100k"
  | "100k-500k"
  | "500k-1m"
  | "1m-5m"
  | "5m+"
  | "prefer_not_to_say";

export const REVENUE_OPTIONS: { value: EstimatedRevenue; label: string }[] = [
  { value: "under_100k", label: "Under $100K" },
  { value: "100k-500k", label: "$100K – $500K" },
  { value: "500k-1m", label: "$500K – $1M" },
  { value: "1m-5m", label: "$1M – $5M" },
  { value: "5m+", label: "$5M+" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export type OnboardingSettings = {
  team_size?: TeamSize;
  years_in_business?: YearsInBusiness;
  primary_goals?: PrimaryGoal[];
  referral_source?: ReferralSource;
  estimated_revenue?: EstimatedRevenue;
  marketing_opt_in?: boolean;
  completed_at?: string;
};

/** Persisted draft fields (sessionStorage). Passwords are kept in React state only. */
export type SignupWizardDraft = {
  email: string;
  password: string;
  confirmPassword: string;
  marketing_opt_in: boolean;
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
  business_type: string;
  team_size: TeamSize | "";
  years_in_business: YearsInBusiness | "";
  primary_goals: PrimaryGoal[];
  referral_source: ReferralSource | "";
  estimated_revenue: EstimatedRevenue | "";
  referral_code: string;
  oauthMode: boolean;
  stepIndex: number;
};

export function emptySignupDraft(referralCode = ""): SignupWizardDraft {
  return {
    email: "",
    password: "",
    confirmPassword: "",
    marketing_opt_in: false,
    first_name: "",
    last_name: "",
    phone: "",
    company_name: "",
    business_type: "",
    team_size: "",
    years_in_business: "",
    primary_goals: [],
    referral_source: "",
    estimated_revenue: "",
    referral_code: referralCode,
    oauthMode: false,
    stepIndex: 0,
  };
}

export function clampSignupStepIndex(
  stepIndex: number,
  oauthMode: boolean,
): number {
  const min = oauthMode ? 1 : 0;
  return Math.max(min, Math.min(SIGNUP_STEP_COUNT - 1, stepIndex));
}

export const SIGNUP_TESTIMONIALS = [
  {
    quote:
      "As soon as we started using DyluxePro, we could make and send estimates within minutes.",
    author: "Andre",
    role: "Adeco Construction Company",
  },
  {
    quote:
      "The pipeline and Client Hub keep our crew off email threads and on the tools.",
    author: "Maria Chen",
    role: "Chen Landscaping",
  },
];

export function stepMeta(stepIndex: number) {
  return SIGNUP_STEPS[stepIndex] ?? SIGNUP_STEPS[0];
}
