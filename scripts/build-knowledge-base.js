#!/usr/bin/env node
/**
 * NYVO Knowledge Base Builder
 * Processes all NYVO website content into a structured JSON for RAG.
 * Run: node scripts/build-knowledge-base.js
 */

const fs = require('fs');
const path = require('path');

// Paths relative to the voice-agent project (parent = website-code)
const PARENT_DIR = path.resolve(__dirname, '..', '..');
const CONTENT_DIR = path.join(PARENT_DIR, 'content');
const SRC_DATA_DIR = path.join(PARENT_DIR, 'src', 'data');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'data', 'knowledge-base.json');

const kb = {
  metadata: {
    builtAt: new Date().toISOString(),
    version: '1.0.0',
    source: 'NYVO Insurance Services LLP',
  },
  articles: [],
  policies: [],
  insurers: [],
  claimsGuides: [],
  companyInfo: null,
  glossary: [],
  calculatorInfo: [],
};

// ─── Helpers ──────────────────────────────────────────────
function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function readJsonIfExists(filePath) {
  const content = readFileIfExists(filePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function extractMarkdownTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

function extractMarkdownSections(content) {
  const sections = [];
  const lines = content.split('\n');
  let currentSection = { title: 'Introduction', content: '' };

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headerMatch) {
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection, content: currentSection.content.trim() });
      }
      currentSection = { title: headerMatch[1].trim(), content: '' };
    } else {
      currentSection.content += line + '\n';
    }
  }
  if (currentSection.content.trim()) {
    sections.push({ ...currentSection, content: currentSection.content.trim() });
  }
  return sections;
}

function chunkText(text, maxChunkSize = 1500) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = '';
    }
    current += para + '\n\n';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function walkDir(dir, extension = '.md') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, extension));
    } else if (entry.name.endsWith(extension)) {
      results.push(fullPath);
    }
  }
  return results;
}

function categorizeArticle(filePath) {
  if (filePath.includes('health-insurance')) return 'health-insurance';
  if (filePath.includes('term-insurance')) return 'term-insurance';
  if (filePath.includes('claims')) return 'claims';
  return 'general';
}

function generateKeywords(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  const keywordPatterns = [
    'health insurance', 'term insurance', 'life insurance', 'claim', 'premium',
    'coverage', 'sum insured', 'copay', 'co-pay', 'deductible', 'waiting period',
    'pre-existing', 'cashless', 'reimbursement', 'network hospital', 'tpa',
    'no claim bonus', 'ncb', 'restoration', 'sub-limit', 'room rent',
    'maternity', 'opd', 'critical illness', 'rider', 'nominee', 'beneficiary',
    'irdai', 'ombudsman', 'portability', 'floater', 'individual', 'family',
    'super top-up', 'top up', 'base plan', 'add-on', 'renewal', 'tax',
    '80d', '80c', 'tax benefit', 'section 80d', 'section 80c',
    'death claim', 'survival benefit', 'surrender', 'ulip', 'endowment',
    'calculator', 'compare', 'best plan', 'how much', 'why',
    'senior citizen', 'nri', 'women', 'smoker', 'medical test',
    'corporate insurance', 'group insurance', 'mediclaim',
    'star health', 'hdfc ergo', 'icici lombard', 'care health', 'niva bupa',
    'bajaj allianz', 'tata aig', 'lic', 'max life', 'sbi life',
    'manipal cigna', 'digit', 'acko', 'reliance', 'new india',
    'aditya birla', 'kotak', 'pnb metlife', 'canara hsbc',
  ];
  return keywordPatterns.filter(kw => text.includes(kw));
}

// ─── Process Articles ─────────────────────────────────────
function processArticles() {
  console.log('📚 Processing articles...');
  const articleDir = path.join(CONTENT_DIR, '02-content-library');
  const files = walkDir(articleDir, '.md');

  for (const file of files) {
    const content = readFileIfExists(file);
    if (!content) continue;

    const title = extractMarkdownTitle(content);
    const category = categorizeArticle(file);
    const sections = extractMarkdownSections(content);
    const chunks = chunkText(content, 2000);
    const keywords = generateKeywords(title, content);
    const slug = path.basename(file, '.md');

    kb.articles.push({
      id: `article-${slug}`,
      title,
      category,
      slug,
      keywords,
      sections: sections.map(s => ({ title: s.title, preview: s.content.substring(0, 200) })),
      chunks,
      fullContent: content,
    });
  }
  console.log(`   ✅ Processed ${kb.articles.length} articles`);
}

// ─── Process Policies ─────────────────────────────────────
function processPolicies() {
  console.log('📋 Processing policies...');
  const policyDir = path.join(SRC_DATA_DIR, 'policy-database');
  const files = walkDir(policyDir, '.json');

  for (const file of files) {
    const data = readJsonIfExists(file);
    if (!data || !data.policy) continue;

    const policy = data.policy;
    const insurer = data.insurer || {};
    const planInfo = data.planInfo || {};
    const coreFeatures = data.coreFeatures || {};
    const waitingPeriods = data.waitingPeriods || {};
    const addOns = data.addOns || [];
    const comparisonMetrics = data.comparisonMetrics || {};

    const category = file.includes('term-insurance') ? 'term-insurance' : 'health-insurance';

    // Build a human-readable summary
    const summaryParts = [
      `${policy.name} by ${insurer.name || 'Unknown Insurer'}`,
      policy.description || '',
      planInfo.sumInsured ? `Sum Insured Options: ${JSON.stringify(planInfo.sumInsured)}` : '',
      planInfo.entryAge ? `Entry Age: ${planInfo.entryAge.min || '?'} to ${planInfo.entryAge.max || '?'} years` : '',
      coreFeatures.roomRent ? `Room Rent: ${typeof coreFeatures.roomRent === 'string' ? coreFeatures.roomRent : JSON.stringify(coreFeatures.roomRent)}` : '',
      coreFeatures.coPay ? `Co-pay: ${typeof coreFeatures.coPay === 'string' ? coreFeatures.coPay : JSON.stringify(coreFeatures.coPay)}` : '',
      coreFeatures.noClaimBonus ? `No Claim Bonus: ${typeof coreFeatures.noClaimBonus === 'string' ? coreFeatures.noClaimBonus : JSON.stringify(coreFeatures.noClaimBonus)}` : '',
      coreFeatures.restorationBenefit ? `Restoration: ${typeof coreFeatures.restorationBenefit === 'string' ? coreFeatures.restorationBenefit : JSON.stringify(coreFeatures.restorationBenefit)}` : '',
      waitingPeriods.preExistingDisease ? `PED Waiting: ${typeof waitingPeriods.preExistingDisease === 'string' ? waitingPeriods.preExistingDisease : JSON.stringify(waitingPeriods.preExistingDisease)}` : '',
      comparisonMetrics.claimSettlementRatio ? `Claim Settlement: ${comparisonMetrics.claimSettlementRatio}` : '',
      comparisonMetrics.networkHospitals ? `Network Hospitals: ${comparisonMetrics.networkHospitals}` : '',
      addOns.length > 0 ? `Add-ons: ${addOns.map(a => typeof a === 'string' ? a : a.name || JSON.stringify(a)).join(', ')}` : '',
    ].filter(Boolean);

    kb.policies.push({
      id: `policy-${path.basename(file, '.json')}`,
      name: policy.name,
      insurerName: insurer.name || 'Unknown',
      insurerId: insurer.id || '',
      category,
      description: policy.description || '',
      summary: summaryParts.join('\n'),
      raw: data,
      keywords: generateKeywords(policy.name + ' ' + (insurer.name || ''), summaryParts.join(' ')),
    });
  }
  console.log(`   ✅ Processed ${kb.policies.length} policies`);
}

// ─── Process Insurers ─────────────────────────────────────
function processInsurers() {
  console.log('🏢 Processing insurers...');
  const insurerFile = path.join(SRC_DATA_DIR, 'insurers.ts');
  const content = readFileIfExists(insurerFile);
  if (!content) {
    console.log('   ⚠️ insurers.ts not found');
    return;
  }

  // Parse the TypeScript file to extract insurer data
  // Extract objects from the arrays
  const insurerRegex = /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*name:\s*['"]([^'"]+)['"]\s*,\s*shortName:\s*['"]([^'"]+)['"][\s\S]*?\}/g;
  let match;
  while ((match = insurerRegex.exec(content)) !== null) {
    const block = match[0];
    const id = match[1];
    const name = match[2];
    const shortName = match[3];

    // Extract renewal link if present
    const linkMatch = block.match(/renewalLink:\s*['"]([^'"]+)['"]/);
    const typeMatch = block.match(/type:\s*['"]([^'"]+)['"]/);

    kb.insurers.push({
      id,
      name,
      shortName,
      type: typeMatch ? typeMatch[1] : 'unknown',
      renewalLink: linkMatch ? linkMatch[1] : '',
    });
  }
  console.log(`   ✅ Processed ${kb.insurers.length} insurers`);
}

// ─── Process Claims Guides ────────────────────────────────
function processClaimsGuides() {
  console.log('📑 Processing claims guides...');
  const claimsDir = path.join(CONTENT_DIR, '07-claims-renewal');
  const files = walkDir(claimsDir, '.md');

  // Also check the claims articles
  const claimsArticleDir = path.join(CONTENT_DIR, '02-content-library', 'claims');
  files.push(...walkDir(claimsArticleDir, '.md'));

  for (const file of files) {
    const content = readFileIfExists(file);
    if (!content) continue;

    const title = extractMarkdownTitle(content);
    const slug = path.basename(file, '.md');
    const category = file.includes('health') ? 'health-insurance' :
                     file.includes('term') ? 'term-insurance' : 'general';

    kb.claimsGuides.push({
      id: `claims-${slug}`,
      title,
      category,
      content,
      keywords: generateKeywords(title, content),
    });
  }
  console.log(`   ✅ Processed ${kb.claimsGuides.length} claims guides`);
}

// ─── Process Company Info ─────────────────────────────────
function processCompanyInfo() {
  console.log('🏠 Processing company info...');
  const companyInfoPath = path.join(CONTENT_DIR, '06-company-data', 'COMPANY-INFO.json');
  const reviewsPath = path.join(CONTENT_DIR, '06-company-data', 'CUSTOMER-REVIEWS.json');
  const trustPath = path.join(CONTENT_DIR, '06-company-data', 'TRUST-MARKERS.json');
  const disclaimerPath = path.join(CONTENT_DIR, '06-company-data', 'DISCLAIMERS.md');

  kb.companyInfo = {
    info: readJsonIfExists(companyInfoPath),
    reviews: readJsonIfExists(reviewsPath),
    trustMarkers: readJsonIfExists(trustPath),
    disclaimers: readFileIfExists(disclaimerPath),
  };
  console.log('   ✅ Company info loaded');
}

// ─── Add Calculator Reference Info ───────────────────────
function addCalculatorInfo() {
  console.log('🧮 Adding calculator reference info...');
  kb.calculatorInfo = [
    {
      id: 'health-coverage-calculator',
      name: 'Health Insurance Coverage Calculator',
      description: 'Calculates recommended health insurance coverage based on city tier, family size, ages, pre-existing conditions, and existing corporate coverage.',
      parameters: [
        { name: 'city_tier', type: 'string', options: ['metro', 'tier1', 'tier2'], description: 'City classification' },
        { name: 'family_members', type: 'array', description: 'Array of family member ages' },
        { name: 'has_preexisting', type: 'boolean', description: 'Whether any member has pre-existing conditions' },
        { name: 'corporate_cover', type: 'number', description: 'Existing corporate coverage amount in lakhs' },
        { name: 'monthly_income', type: 'number', description: 'Monthly household income in INR' },
      ],
      methodology: 'Uses medical inflation rate of 10% annually, city-wise cost multipliers (Metro: 1.5x, Tier-1: 1.2x, Tier-2: 1.0x), age-based risk adjustment, and recommends base + super top-up split.',
    },
    {
      id: 'term-insurance-calculator',
      name: 'Term Insurance Coverage Calculator',
      description: 'Calculates recommended term life insurance coverage based on income replacement, debts, education goals, and dependents.',
      parameters: [
        { name: 'monthly_expenses', type: 'number', description: 'Monthly household expenses in INR' },
        { name: 'annual_income', type: 'number', description: 'Annual income in INR' },
        { name: 'total_debts', type: 'number', description: 'Total outstanding loans/debts in INR' },
        { name: 'num_children', type: 'number', description: 'Number of dependent children' },
        { name: 'education_goal_per_child', type: 'number', description: 'Target education fund per child in INR' },
        { name: 'existing_life_cover', type: 'number', description: 'Existing life insurance coverage in INR' },
        { name: 'current_age', type: 'number', description: 'Current age of the policyholder' },
        { name: 'retirement_age', type: 'number', description: 'Planned retirement age' },
      ],
      methodology: 'Uses income replacement method: 10-15x annual income, adjusted for debts, education goals, and existing coverage. Recommends coverage until age 60-65.',
    },
  ];
  console.log('   ✅ Calculator info added');
}

// ─── Main ─────────────────────────────────────────────────
function main() {
  console.log('\n🚀 NYVO Knowledge Base Builder\n');
  console.log(`   Content dir: ${CONTENT_DIR}`);
  console.log(`   Source data: ${SRC_DATA_DIR}`);
  console.log(`   Output: ${OUTPUT_FILE}\n`);

  // Check if source directories exist
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('⚠️  Content directory not found. Creating minimal KB...');
  }

  processArticles();
  processPolicies();
  processInsurers();
  processClaimsGuides();
  processCompanyInfo();
  addCalculatorInfo();

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the knowledge base
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(kb, null, 2), 'utf-8');
  const sizeKB = (fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1);

  console.log('\n✅ Knowledge base built successfully!');
  console.log(`   📄 Articles: ${kb.articles.length}`);
  console.log(`   📋 Policies: ${kb.policies.length}`);
  console.log(`   🏢 Insurers: ${kb.insurers.length}`);
  console.log(`   📑 Claims guides: ${kb.claimsGuides.length}`);
  console.log(`   🧮 Calculators: ${kb.calculatorInfo.length}`);
  console.log(`   📦 File size: ${sizeKB} KB`);
  console.log(`   📍 Output: ${OUTPUT_FILE}\n`);
}

main();
