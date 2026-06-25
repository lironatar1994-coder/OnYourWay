import { prisma } from './prisma.js';

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'at',
  'but',
  'by',
  'can',
  'do',
  'does',
  'for',
  'from',
  'have',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'need',
  'of',
  'on',
  'or',
  'please',
  'the',
  'to',
  'with',
]);

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensFrom(...values) {
  const tokens = new Set();

  for (const value of values) {
    for (const token of normalize(value).split(' ')) {
      if (token.length >= 3 && !STOP_WORDS.has(token)) {
        tokens.add(token);
      }
    }
  }

  return tokens;
}

function containsPhrase(haystack, needle) {
  const normalizedNeedle = normalize(needle);
  return normalizedNeedle.length > 0 && normalize(haystack).includes(normalizedNeedle);
}

function scoreProvider(provider, lead) {
  const reasons = [];
  let score = 0;

  const leadText = [lead.serviceType, lead.requestText, lead.notes].filter(Boolean).join(' ');
  const providerText = [provider.category, provider.serviceText, provider.serviceArea].filter(Boolean).join(' ');

  if (provider.category && normalize(provider.category) === normalize(lead.serviceType)) {
    score += 50;
    reasons.push('Exact service category match');
  } else if (provider.category && containsPhrase(leadText, provider.category)) {
    score += 30;
    reasons.push('Customer text mentions provider category');
  }

  const leadTokens = tokensFrom(lead.requestText, lead.notes);
  const providerTokens = tokensFrom(provider.serviceText);
  const sharedServiceTokens = [...leadTokens].filter((token) => providerTokens.has(token));

  if (sharedServiceTokens.length > 0) {
    score += Math.min(sharedServiceTokens.length * 12, 48);
    reasons.push('Customer case matches provider service profile');
  }

  if (lead.city && provider.serviceArea && containsPhrase(provider.serviceArea, lead.city)) {
    score += 15;
    reasons.push('Service area matches customer city');
  }

  if (provider.serviceText && containsPhrase(provider.serviceText, lead.requestText)) {
    score += 20;
    reasons.push('Provider service text contains the customer case');
  }

  const priorityBoost = Math.max(0, 10 - Math.min(provider.priority || 100, 10));
  score += priorityBoost;

  if (priorityBoost > 0) {
    reasons.push('High provider priority');
  }

  if (score === 0) {
    reasons.push('Fallback active provider');
  }

  return {
    provider,
    reasons,
    score,
  };
}

export async function getProviderSuggestions(lead, { limit = 5 } = {}) {
  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });

  return providers
    .map((provider) => scoreProvider(provider, lead))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.provider.priority !== right.provider.priority) {
        return left.provider.priority - right.provider.priority;
      }

      return new Date(left.provider.createdAt).getTime() - new Date(right.provider.createdAt).getTime();
    })
    .slice(0, limit);
}

export function serializeSuggestion(suggestion) {
  return {
    provider: suggestion.provider,
    reasons: suggestion.reasons,
    score: suggestion.score,
  };
}
