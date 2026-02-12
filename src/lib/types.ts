// ─── Voice Agent Types ────────────────────────────────────

export type Language = 'en' | 'hi';

export type AgentStatus =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'thinking'
  | 'speaking'
  | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  language?: Language;
  toolResults?: ToolResult[];
}

export interface ToolResult {
  toolName: string;
  result: unknown;
  displayType?: 'calculator' | 'comparison' | 'claims' | 'booking' | 'insurer' | 'text';
}

// ─── Knowledge Base Types ─────────────────────────────────

export interface KnowledgeBase {
  metadata: { builtAt: string; version: string; source: string };
  articles: Article[];
  policies: Policy[];
  insurers: Insurer[];
  claimsGuides: ClaimsGuide[];
  companyInfo: CompanyInfo | null;
  calculatorInfo: CalculatorInfo[];
}

export interface Article {
  id: string;
  title: string;
  category: string;
  slug: string;
  keywords: string[];
  sections: { title: string; preview: string }[];
  chunks: string[];
  fullContent: string;
}

export interface Policy {
  id: string;
  name: string;
  insurerName: string;
  insurerId: string;
  category: string;
  description: string;
  summary: string;
  raw: Record<string, unknown>;
  keywords: string[];
}

export interface Insurer {
  id: string;
  name: string;
  shortName: string;
  type: string;
  renewalLink: string;
}

export interface ClaimsGuide {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
}

export interface CompanyInfo {
  info: Record<string, unknown> | null;
  reviews: Record<string, unknown> | null;
  trustMarkers: Record<string, unknown> | null;
  disclaimers: string | null;
}

export interface CalculatorInfo {
  id: string;
  name: string;
  description: string;
  parameters: { name: string; type: string; description: string; options?: string[] }[];
  methodology: string;
}

// ─── Calculator Types ─────────────────────────────────────

export interface HealthCalcInput {
  city_tier: 'metro' | 'tier1' | 'tier2';
  family_members: number[];
  has_preexisting: boolean;
  corporate_cover: number;
  monthly_income: number;
}

export interface HealthCalcResult {
  recommended_cover_lakhs: number;
  base_plan_lakhs: number;
  super_topup_lakhs: number;
  coverage_gap_lakhs: number;
  estimated_premium_range: { min: number; max: number };
  reasoning: string[];
}

export interface TermCalcInput {
  monthly_expenses: number;
  annual_income: number;
  total_debts: number;
  num_children: number;
  education_goal_per_child: number;
  existing_life_cover: number;
  current_age: number;
  retirement_age: number;
}

export interface TermCalcResult {
  recommended_cover_cr: number;
  income_replacement: number;
  debt_cover: number;
  education_fund: number;
  total_need: number;
  gap: number;
  recommended_tenure: number;
  estimated_premium_range: { min: number; max: number };
  reasoning: string[];
}
