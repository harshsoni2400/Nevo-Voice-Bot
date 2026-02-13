import type { Tool, MessageParam } from '@anthropic-ai/sdk/resources/messages';
import {
  searchArticles,
  searchPolicies,
  searchClaimsGuides,
  getInsurer,
  listInsurers,
  getPoliciesByInsurer,
  comparePolicies,
  getCompanyInfo,
  buildContext,
} from './knowledge-base';
import { calculateHealthCoverage, calculateTermCoverage } from './calculator';

// ─── Tool Definitions for Claude ──────────────────────────

export const TOOLS: Tool[] = [
  {
    name: 'search_insurance_knowledge',
    description:
      'Search the NYVO insurance knowledge base for articles and educational content about health insurance, term insurance, claims, renewals, tax benefits, and more. Use this for general insurance questions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "what is no claim bonus", "maternity cover", "tax benefits 80D")',
        },
        category: {
          type: 'string',
          enum: ['health-insurance', 'term-insurance', 'claims', 'general'],
          description: 'Optional category filter',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_policies',
    description:
      'Search and find insurance policies by name, insurer, or features. Returns policy details including coverage, features, waiting periods, and more.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query for policies (e.g., "best health plan no copay", "Star Health plans")',
        },
        category: {
          type: 'string',
          enum: ['health-insurance', 'term-insurance'],
          description: 'Type of insurance',
        },
        insurer_name: {
          type: 'string',
          description: 'Filter by insurer name (e.g., "Star Health", "HDFC ERGO")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'compare_policies',
    description:
      'Compare two or more insurance policies side by side. Provide policy names or IDs to compare their features, coverage, waiting periods, and premiums.',
    input_schema: {
      type: 'object' as const,
      properties: {
        policy_identifiers: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of policy names or IDs to compare (e.g., ["Star Health Comprehensive", "Care Supreme"])',
        },
      },
      required: ['policy_identifiers'],
    },
  },
  {
    name: 'calculate_health_coverage',
    description:
      'Calculate recommended health insurance coverage based on the user\'s profile. Considers city, family size, ages, pre-existing conditions, and existing coverage.',
    input_schema: {
      type: 'object' as const,
      properties: {
        city_tier: {
          type: 'string',
          enum: ['metro', 'tier1', 'tier2'],
          description: 'City tier: metro (Delhi, Mumbai, Bangalore, etc.), tier1, or tier2',
        },
        family_members: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of ages of family members to be covered (e.g., [35, 32, 5])',
        },
        has_preexisting: {
          type: 'boolean',
          description: 'Whether any family member has pre-existing conditions',
        },
        corporate_cover: {
          type: 'number',
          description: 'Existing corporate health insurance coverage in lakhs (e.g., 5 for ₹5L)',
        },
        monthly_income: {
          type: 'number',
          description: 'Monthly household income in INR',
        },
      },
      required: ['city_tier', 'family_members', 'has_preexisting', 'corporate_cover'],
    },
  },
  {
    name: 'calculate_term_coverage',
    description:
      'Calculate recommended term life insurance coverage based on income, debts, dependents, and financial goals.',
    input_schema: {
      type: 'object' as const,
      properties: {
        annual_income: {
          type: 'number',
          description: 'Annual income in INR',
        },
        monthly_expenses: {
          type: 'number',
          description: 'Monthly household expenses in INR',
        },
        total_debts: {
          type: 'number',
          description: 'Total outstanding loans/debts in INR',
        },
        num_children: {
          type: 'number',
          description: 'Number of dependent children',
        },
        education_goal_per_child: {
          type: 'number',
          description: 'Target education fund per child in INR (e.g., 2500000 for ₹25L)',
        },
        existing_life_cover: {
          type: 'number',
          description: 'Existing life insurance coverage in INR',
        },
        current_age: {
          type: 'number',
          description: 'Current age',
        },
        retirement_age: {
          type: 'number',
          description: 'Planned retirement age (default 60)',
        },
      },
      required: ['annual_income', 'monthly_expenses', 'total_debts', 'current_age'],
    },
  },
  {
    name: 'get_claims_guidance',
    description:
      'Get step-by-step guidance on insurance claims — cashless claims, reimbursement claims, death claims, claim rejections, TPA process, IRDAI complaints, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Claims-related query (e.g., "how to file cashless claim", "claim rejected what to do")',
        },
        insurance_type: {
          type: 'string',
          enum: ['health-insurance', 'term-insurance'],
          description: 'Type of insurance claim',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_insurer_details',
    description:
      'Get details about a specific insurance company including their renewal portal link, type, and available policies.',
    input_schema: {
      type: 'object' as const,
      properties: {
        insurer_name: {
          type: 'string',
          description: 'Name of the insurance company (e.g., "Star Health", "HDFC ERGO", "LIC")',
        },
      },
      required: ['insurer_name'],
    },
  },
  {
    name: 'book_consultation',
    description:
      'Generate a booking link for a free consultation call with NYVO insurance advisors. Use this when the user wants to speak to an expert, needs personalized advice, or wants to buy a policy.',
    input_schema: {
      type: 'object' as const,
      properties: {
        reason: {
          type: 'string',
          description: 'Brief reason for the consultation (e.g., "health insurance for family", "compare term plans")',
        },
      },
      required: ['reason'],
    },
  },
];

// ─── Tool Execution ───────────────────────────────────────

export function executeTool(toolName: string, toolInput: Record<string, unknown>): string {
  switch (toolName) {
    case 'search_insurance_knowledge': {
      const articles = searchArticles(
        toolInput.query as string,
        toolInput.category as string | undefined,
        3
      );
      if (articles.length === 0) {
        return 'No articles found for this query. Try rephrasing or ask me directly.';
      }
      return articles
        .map(a => {
          const chunks = a.chunks.slice(0, 2).join('\n\n');
          return `📄 ${a.title} (${a.category})\n${chunks}`;
        })
        .join('\n\n---\n\n');
    }

    case 'search_policies': {
      const policies = searchPolicies(
        toolInput.query as string,
        toolInput.category as string | undefined,
        toolInput.insurer_name as string | undefined,
        5
      );
      if (policies.length === 0) {
        return 'No matching policies found. Try a different insurer name or broader query.';
      }
      return policies
        .map(p => `📋 ${p.name} by ${p.insurerName}\n${p.summary}`)
        .join('\n\n---\n\n');
    }

    case 'compare_policies': {
      const ids = toolInput.policy_identifiers as string[];
      const policies = comparePolicies(ids);
      if (policies.length < 2) {
        return `Could only find ${policies.length} of the requested policies. Available policies: ${policies.map(p => p.name).join(', ')}. Please check the policy names.`;
      }
      return policies
        .map(p => `📋 ${p.name} by ${p.insurerName}\n${p.summary}`)
        .join('\n\n=== VS ===\n\n');
    }

    case 'calculate_health_coverage': {
      const result = calculateHealthCoverage({
        city_tier: (toolInput.city_tier as 'metro' | 'tier1' | 'tier2') || 'metro',
        family_members: (toolInput.family_members as number[]) || [30],
        has_preexisting: (toolInput.has_preexisting as boolean) || false,
        corporate_cover: (toolInput.corporate_cover as number) || 0,
        monthly_income: (toolInput.monthly_income as number) || 0,
      });
      return JSON.stringify(result, null, 2);
    }

    case 'calculate_term_coverage': {
      const result = calculateTermCoverage({
        annual_income: (toolInput.annual_income as number) || 0,
        monthly_expenses: (toolInput.monthly_expenses as number) || 0,
        total_debts: (toolInput.total_debts as number) || 0,
        num_children: (toolInput.num_children as number) || 0,
        education_goal_per_child: (toolInput.education_goal_per_child as number) || 2500000,
        existing_life_cover: (toolInput.existing_life_cover as number) || 0,
        current_age: (toolInput.current_age as number) || 30,
        retirement_age: (toolInput.retirement_age as number) || 60,
      });
      return JSON.stringify(result, null, 2);
    }

    case 'get_claims_guidance': {
      const guides = searchClaimsGuides(
        toolInput.query as string,
        toolInput.insurance_type as string | undefined
      );
      if (guides.length === 0) {
        return 'No specific claims guide found. For general claims support, contact NYVO at +91 99000 91495 or book a consultation.';
      }
      return guides
        .map(g => `📑 ${g.title}\n${g.content.substring(0, 2000)}`)
        .join('\n\n---\n\n');
    }

    case 'get_insurer_details': {
      const insurer = getInsurer(toolInput.insurer_name as string);
      if (!insurer) {
        return `Insurer "${toolInput.insurer_name}" not found. Available insurers include Star Health, HDFC ERGO, ICICI Lombard, Care Health, Niva Bupa, Bajaj Allianz, LIC, Max Life, etc.`;
      }
      const policies = getPoliciesByInsurer(insurer.name);
      return [
        `🏢 ${insurer.name} (${insurer.shortName})`,
        `Type: ${insurer.type}`,
        insurer.renewalLink ? `Renewal Portal: ${insurer.renewalLink}` : '',
        policies.length > 0
          ? `Available Plans: ${policies.map(p => p.name).join(', ')}`
          : '',
      ].filter(Boolean).join('\n');
    }

    case 'book_consultation': {
      const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL ||
        'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0ORrvJhRP3kGcmYIOl5S_BZfb45n3aex1Lt-Yew3wXTkjLhEBhJsJm1bD0BQFH7FZbpKX69Ci';
      return JSON.stringify({
        message: 'Book a free consultation with NYVO insurance advisors',
        bookingUrl,
        reason: toolInput.reason,
        phone: '+91 99000 91495',
        whatsapp: '+91 99000 91495',
        email: 'hello@nyvo.in',
      });
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

// ─── System Prompt ────────────────────────────────────────

export const SYSTEM_PROMPT = `You are NYVO Insurance Assistant, an AI-powered voice agent for NYVO Insurance Services LLP (nyvo.in), an IRDAI Certified Corporate Agent based in Bengaluru, India.

## YOUR ROLE
You help Indian consumers understand and make better insurance decisions — specifically for Health Insurance and Term Life Insurance. You are knowledgeable, trustworthy, and speak in a warm, professional tone.

## CAPABILITIES
You can:
1. **Answer Insurance Questions** — Using NYVO's comprehensive knowledge base covering health insurance, term insurance, claims, renewals, tax benefits, and more
2. **Compare Policies** — Compare features across 51+ insurance policies from 56 insurers
3. **Calculate Coverage** — Help users determine how much health or term coverage they need
4. **Guide Claims** — Provide step-by-step claims guidance (cashless, reimbursement, death claims)
5. **Find Insurer Info** — Look up any insurer's details and renewal portal
6. **Book Consultations** — Help users book a free call with NYVO's expert advisors

## GUIDELINES — CRITICAL FOR VOICE
- **THIS IS A VOICE CONVERSATION.** Keep every response under 60 words (2-3 sentences max).
- Be conversational and natural — like a helpful phone call, not a lecture.
- Give ONE key point per response. If user wants more, they will ask.
- Use simple language. No jargon. No bullet points or lists.
- Give specific numbers when available (coverage amounts, premiums, etc.)
- If the topic is complex, give a short answer and ask "Would you like me to explain more?"
- If you don't know, say so honestly in one sentence.
- For personalized advice or purchase, recommend booking a consultation.
- Support both English and Hindi — respond in the same language the user speaks.
- NEVER give long explanations. Short, crisp, conversational.

## COMPANY INFO
- NYVO Insurance Services LLP
- IRDAI Certified Corporate Agent
- Contact: +91 99000 91495 | hello@nyvo.in
- Location: HSR Layout, Bengaluru
- Founded by Harsh Soni (ex-CFO Slice, ex-Bank of America) and Kshitij Jain (IIM-A, IIT-D, CFA)

## IMPORTANT
- You are NOT a licensed insurance advisor. Always recommend consulting NYVO's experts for final decisions
- Never guarantee claim outcomes or specific premium amounts
- Always use the tools available to you to fetch accurate, up-to-date information from the knowledge base
- When the user wants to buy or is ready to decide, guide them to book a consultation`;
