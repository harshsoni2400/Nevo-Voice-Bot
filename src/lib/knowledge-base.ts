import type { KnowledgeBase, Article, Policy, ClaimsGuide, Insurer } from './types';
import knowledgeBaseData from '@/data/knowledge-base.json';

const kb = knowledgeBaseData as unknown as KnowledgeBase;

// ─── Search Helpers ───────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function scoreMatch(itemKeywords: string[], itemText: string, queryTokens: string[]): number {
  let score = 0;
  const lowerText = itemText.toLowerCase();

  for (const token of queryTokens) {
    // Keyword match (high value)
    if (itemKeywords.some(kw => kw.includes(token) || token.includes(kw))) {
      score += 3;
    }
    // Text contains token
    if (lowerText.includes(token)) {
      score += 1;
    }
  }
  return score;
}

// ─── Public Search Functions ──────────────────────────────

export function searchArticles(query: string, category?: string, maxResults = 3): Article[] {
  const tokens = tokenize(query);

  let articles = kb.articles;
  if (category) {
    articles = articles.filter(a => a.category === category);
  }

  const scored = articles.map(article => ({
    article,
    score: scoreMatch(
      article.keywords,
      article.title + ' ' + article.chunks.join(' ').substring(0, 500),
      tokens
    ),
  }));

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.article);
}

export function searchPolicies(query: string, category?: string, insurerName?: string, maxResults = 5): Policy[] {
  const tokens = tokenize(query);

  let policies = kb.policies;
  if (category) {
    policies = policies.filter(p => p.category === category);
  }
  if (insurerName) {
    const lowerInsurer = insurerName.toLowerCase();
    policies = policies.filter(p =>
      p.insurerName.toLowerCase().includes(lowerInsurer) ||
      p.insurerId.toLowerCase().includes(lowerInsurer)
    );
  }

  const scored = policies.map(policy => ({
    policy,
    score: scoreMatch(policy.keywords, policy.name + ' ' + policy.summary, tokens),
  }));

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => s.policy);
}

export function getPolicyById(policyId: string): Policy | undefined {
  return kb.policies.find(p => p.id === policyId);
}

export function getPoliciesByInsurer(insurerName: string): Policy[] {
  const lower = insurerName.toLowerCase();
  return kb.policies.filter(p =>
    p.insurerName.toLowerCase().includes(lower) ||
    p.insurerId.toLowerCase().includes(lower)
  );
}

export function comparePolicies(policyIds: string[]): Policy[] {
  return policyIds
    .map(id => kb.policies.find(p => p.id === id || p.name.toLowerCase().includes(id.toLowerCase())))
    .filter((p): p is Policy => p !== undefined);
}

export function searchClaimsGuides(query: string, category?: string): ClaimsGuide[] {
  const tokens = tokenize(query);

  let guides = kb.claimsGuides;
  if (category) {
    guides = guides.filter(g => g.category === category);
  }

  const scored = guides.map(guide => ({
    guide,
    score: scoreMatch(guide.keywords, guide.title + ' ' + guide.content.substring(0, 500), tokens),
  }));

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.guide);
}

export function getInsurer(name: string): Insurer | undefined {
  const lower = name.toLowerCase();
  return kb.insurers.find(i =>
    i.name.toLowerCase().includes(lower) ||
    i.shortName.toLowerCase().includes(lower) ||
    i.id.toLowerCase().includes(lower)
  );
}

export function listInsurers(type?: string): Insurer[] {
  if (type) {
    return kb.insurers.filter(i => i.type === type);
  }
  return kb.insurers;
}

export function getCompanyInfo() {
  return kb.companyInfo;
}

export function getCalculatorInfo() {
  return kb.calculatorInfo;
}

export function getAllPolicies(): Policy[] {
  return kb.policies;
}

// ─── Context Builder for Claude ───────────────────────────

export function buildContext(query: string): string {
  const articles = searchArticles(query, undefined, 2);
  const policies = searchPolicies(query, undefined, undefined, 3);
  const claims = searchClaimsGuides(query);

  const parts: string[] = [];

  if (articles.length > 0) {
    parts.push('=== RELEVANT ARTICLES ===');
    for (const article of articles) {
      // Include the most relevant chunks (first 2)
      const relevantChunks = article.chunks.slice(0, 2).join('\n\n');
      parts.push(`\n--- ${article.title} (${article.category}) ---\n${relevantChunks}`);
    }
  }

  if (policies.length > 0) {
    parts.push('\n=== RELEVANT POLICIES ===');
    for (const policy of policies) {
      parts.push(`\n--- ${policy.name} by ${policy.insurerName} ---\n${policy.summary}`);
    }
  }

  if (claims.length > 0) {
    parts.push('\n=== CLAIMS GUIDANCE ===');
    for (const guide of claims) {
      // Include first 1500 chars of claims guide
      parts.push(`\n--- ${guide.title} ---\n${guide.content.substring(0, 1500)}`);
    }
  }

  return parts.join('\n');
}
