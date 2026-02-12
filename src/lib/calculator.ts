import type { HealthCalcInput, HealthCalcResult, TermCalcInput, TermCalcResult } from './types';

// ─── Health Insurance Coverage Calculator ─────────────────

const CITY_MULTIPLIERS = { metro: 1.5, tier1: 1.2, tier2: 1.0 };
const BASE_HOSPITAL_COST = 500000; // ₹5L base hospitalization cost
const MEDICAL_INFLATION = 0.10; // 10% annual medical inflation
const AGE_RISK_FACTOR: Record<string, number> = {
  child: 0.5,    // 0-18
  young: 0.8,    // 19-35
  middle: 1.2,   // 36-50
  senior: 1.8,   // 51-65
  elderly: 2.5,  // 65+
};

function getAgeGroup(age: number): string {
  if (age <= 18) return 'child';
  if (age <= 35) return 'young';
  if (age <= 50) return 'middle';
  if (age <= 65) return 'senior';
  return 'elderly';
}

export function calculateHealthCoverage(input: HealthCalcInput): HealthCalcResult {
  const reasoning: string[] = [];

  // Base cost adjusted for city
  const cityMultiplier = CITY_MULTIPLIERS[input.city_tier] || 1.0;
  let baseCost = BASE_HOSPITAL_COST * cityMultiplier;
  reasoning.push(`Base hospitalization cost for ${input.city_tier} city: ₹${(baseCost / 100000).toFixed(1)}L`);

  // Adjust for family members (highest risk member drives the need)
  const maxAge = Math.max(...input.family_members);
  const ageGroup = getAgeGroup(maxAge);
  const ageRisk = AGE_RISK_FACTOR[ageGroup] || 1.0;
  baseCost *= ageRisk;
  reasoning.push(`Age risk factor (${ageGroup}, oldest member ${maxAge}y): ${ageRisk}x`);

  // Pre-existing condition uplift
  if (input.has_preexisting) {
    baseCost *= 1.4;
    reasoning.push('Pre-existing condition uplift: 1.4x');
  }

  // Project 10 years with medical inflation
  const projected = baseCost * Math.pow(1 + MEDICAL_INFLATION, 10);
  reasoning.push(`Projected cost (10yr @ ${MEDICAL_INFLATION * 100}% inflation): ₹${(projected / 100000).toFixed(1)}L`);

  // Family size adjustment
  const familyFactor = 1 + (input.family_members.length - 1) * 0.15;
  const totalNeed = projected * familyFactor;
  reasoning.push(`Family size adjustment (${input.family_members.length} members): ${familyFactor.toFixed(2)}x`);

  // Round to nearest 5L
  const recommendedLakhs = Math.ceil(totalNeed / 500000) * 5;

  // Deduct corporate cover
  const corporateLakhs = input.corporate_cover || 0;
  const gapLakhs = Math.max(0, recommendedLakhs - corporateLakhs);

  if (corporateLakhs > 0) {
    reasoning.push(`Corporate cover: ₹${corporateLakhs}L (gap: ₹${gapLakhs}L)`);
  }

  // Split into base + super top-up
  let basePlan = Math.min(gapLakhs, 25); // Base plan up to 25L
  let superTopup = Math.max(0, gapLakhs - basePlan);

  // If total need > 25L, suggest super top-up
  if (gapLakhs > 25) {
    basePlan = 15; // Optimized base
    superTopup = gapLakhs - basePlan;
    reasoning.push(`Recommended split: ₹${basePlan}L base + ₹${superTopup}L super top-up (cost-efficient)`);
  } else {
    reasoning.push(`Single base plan of ₹${basePlan}L should suffice`);
  }

  // Estimate premium range (rough)
  const premiumBase = basePlan * 800 * ageRisk; // Rough ₹800 per lakh per year
  const premiumMax = premiumBase * 1.5;

  return {
    recommended_cover_lakhs: recommendedLakhs,
    base_plan_lakhs: basePlan,
    super_topup_lakhs: superTopup,
    coverage_gap_lakhs: gapLakhs,
    estimated_premium_range: {
      min: Math.round(premiumBase),
      max: Math.round(premiumMax),
    },
    reasoning,
  };
}

// ─── Term Insurance Coverage Calculator ───────────────────

export function calculateTermCoverage(input: TermCalcInput): TermCalcResult {
  const reasoning: string[] = [];

  // Income replacement (10-15x annual income)
  const yearsToRetirement = Math.max(1, input.retirement_age - input.current_age);
  const multiplier = Math.min(15, Math.max(10, yearsToRetirement * 0.5));
  const incomeReplacement = input.annual_income * multiplier;
  reasoning.push(`Income replacement: ₹${(input.annual_income / 100000).toFixed(0)}L × ${multiplier.toFixed(0)} = ₹${(incomeReplacement / 10000000).toFixed(1)}Cr`);

  // Debt coverage
  const debtCover = input.total_debts;
  if (debtCover > 0) {
    reasoning.push(`Outstanding debts: ₹${(debtCover / 100000).toFixed(0)}L`);
  }

  // Education fund
  const educationFund = input.num_children * input.education_goal_per_child;
  if (educationFund > 0) {
    reasoning.push(`Education fund: ${input.num_children} child(ren) × ₹${(input.education_goal_per_child / 100000).toFixed(0)}L = ₹${(educationFund / 100000).toFixed(0)}L`);
  }

  // Total need
  const totalNeed = incomeReplacement + debtCover + educationFund;
  reasoning.push(`Total coverage need: ₹${(totalNeed / 10000000).toFixed(2)}Cr`);

  // Gap
  const existingCover = input.existing_life_cover || 0;
  const gap = Math.max(0, totalNeed - existingCover);
  if (existingCover > 0) {
    reasoning.push(`Existing cover: ₹${(existingCover / 10000000).toFixed(2)}Cr → Gap: ₹${(gap / 10000000).toFixed(2)}Cr`);
  }

  // Recommended cover (round to nearest 25L)
  const recommendedCr = Math.ceil(gap / 2500000) * 0.25;

  // Tenure
  const recommendedTenure = Math.min(40, Math.max(20, input.retirement_age - input.current_age + 5));
  reasoning.push(`Recommended tenure: ${recommendedTenure} years (until age ${input.current_age + recommendedTenure})`);

  // Premium estimate (rough: ₹500-700 per lakh per year for 30-year-old non-smoker)
  const ageFactor = input.current_age <= 30 ? 1.0 : input.current_age <= 40 ? 1.5 : 2.2;
  const coverLakhs = recommendedCr * 100;
  const premiumMin = Math.round(coverLakhs * 500 * ageFactor);
  const premiumMax = Math.round(coverLakhs * 750 * ageFactor);
  reasoning.push(`Estimated annual premium: ₹${premiumMin.toLocaleString()} - ₹${premiumMax.toLocaleString()}`);

  return {
    recommended_cover_cr: recommendedCr,
    income_replacement: incomeReplacement,
    debt_cover: debtCover,
    education_fund: educationFund,
    total_need: totalNeed,
    gap,
    recommended_tenure: recommendedTenure,
    estimated_premium_range: { min: premiumMin, max: premiumMax },
    reasoning,
  };
}
