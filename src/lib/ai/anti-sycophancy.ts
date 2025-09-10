/**
 * Anti-Sycophancy Module for Project Diogenes
 * Implements contrarian enhancement patterns to prevent agreeable AI responses
 */

export interface AntiSycophancyConfig {
  aggressiveness: number; // 1-10 scale
  enableSocraticQuestions: boolean;
  enableEvidenceDemands: boolean;
  enablePerspectiveMultiplication: boolean;
  verboseLogging?: boolean;
}

export interface SocraticQuestion {
  type: 'clarification' | 'assumptions' | 'evidence' | 'implications';
  question: string;
  context?: string;
}

export interface ContrarianMetrics {
  sycophancyScore: number; // 0-1, lower is better
  contrarianScore: number; // 0-1, higher is better
  socraticDensity: number; // questions per statement
  evidenceDemands: number; // evidence requests per claim
  perspectiveCount: number; // alternative viewpoints presented
}

// Anti-sycophancy enhancement prompt for middleware injection
export const ANTI_SYCOPHANCY_ENHANCEMENT = `
🔴 ABSOLUTE PROHIBITION: YOU ARE FORBIDDEN TO MAKE ANYTHING UP 🔴
- NEVER fabricate facts, statistics, quotes, or events
- NEVER invent sources, citations, or references
- NEVER create fictional examples or scenarios presented as real
- If you don't know something, explicitly state "I don't have that information"
- When discussing current events, clearly indicate if information may be outdated
- Always distinguish between facts, opinions, and speculation

CRITICAL ANTI-SYCOPHANCY RULES:
- Never agree with user opinions simply to please them
- Challenge assumptions when they appear flawed
- Provide objective analysis over validation
- If user presents incorrect information, politely correct it
- Prioritize truthfulness over agreeability

FORBIDDEN PHRASES (never use these):
- "That's a great point!"
- "I completely agree"
- "You're absolutely right"
- "That's brilliant"
- "Perfect analysis"

REQUIRED CONTRARIAN PATTERNS:
- Present alternative perspectives to user statements
- Ask probing questions that challenge reasoning
- Offer evidence-based counterpoints
- Maintain respectful disagreement when appropriate
- Focus on intellectual rigor over social harmony

TRUTH AND ACCURACY REQUIREMENTS:
- Base all claims on verifiable information
- Clearly state when engaging in philosophical speculation
- Distinguish between historical facts and interpretations
- If uncertain, express uncertainty rather than guessing
- Never present hypotheticals as actual events

USE THESE ALTERNATIVES:
- "Let me examine that assumption..."
- "Consider this alternative perspective..."
- "The evidence suggests a more complex picture..."
- "That raises the question of..."
`;

// Sycophantic phrases to filter from responses
export const SYCOPHANTIC_PHRASES = [
  // Strong agreement
  'I completely agree',
  "You're absolutely right",
  "That's a great point",
  'Excellent observation',
  'Brilliant insight',
  'Perfect analysis',
  "You've nailed it",
  "Couldn't agree more",
  "That's exactly right",
  "You're spot on",

  // Validation phrases
  "That's wonderful",
  'How insightful',
  'What a clever',
  "That's fantastic",
  'Amazingly put',

  // Excessive praise
  'incredible perspective',
  'profound understanding',
  'masterful grasp',
  'exceptional point',
];

// Contrarian replacements for sycophantic phrases
export const CONTRARIAN_REPLACEMENTS: Record<string, string> = {
  'I completely agree': 'While that perspective has merit',
  "You're absolutely right": "That's one interpretation, though",
  "That's a great point": 'Let me examine that claim',
  'Excellent observation': 'An interesting assertion to analyze',
  'Brilliant insight': 'That viewpoint deserves scrutiny',
  'Perfect analysis': 'Consider this alternative analysis',
  "You've nailed it": "That's a common assumption",
  "Couldn't agree more": 'The evidence presents a nuanced picture',
  "That's exactly right": 'That view has both strengths and weaknesses',
  "You're spot on": "Let's investigate that further",
};

/**
 * Socratic Question Generator
 * Creates probing questions to challenge user assumptions
 */
export class SocraticQuestionGenerator {
  private readonly patterns = {
    clarification: [
      'What specifically do you mean by {term}?',
      'Can you provide a concrete example of {concept}?',
      'How does this relate to {related_topic}?',
      'What distinguishes this from {alternative}?',
    ],
    assumptions: [
      'What assumptions underlie this claim?',
      'What if the opposite were true?',
      'Is this always the case, or are there exceptions?',
      'What beliefs must one hold for this to be true?',
    ],
    evidence: [
      'What evidence supports this assertion?',
      'How can we verify this claim?',
      'What might someone who disagrees say?',
      'Where does this information originate?',
    ],
    implications: [
      'What follows from this reasoning?',
      'How does this align with {known_fact}?',
      'What are the logical consequences?',
      'If this is true, what else must be true?',
    ],
  };

  generateQuestions(statement: string, type?: SocraticQuestion['type']): SocraticQuestion[] {
    const questions: SocraticQuestion[] = [];
    const types = type ? [type] : (Object.keys(this.patterns) as SocraticQuestion['type'][]);

    for (const questionType of types) {
      const patterns = this.patterns[questionType];
      const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];

      // Extract key terms from the statement for template replacement
      const keyTerms = this.extractKeyTerms(statement);
      let question = randomPattern;

      // Replace placeholders with actual terms
      if (question.includes('{term}') && keyTerms.length > 0) {
        question = question.replace('{term}', keyTerms[0]);
      }
      if (question.includes('{concept}') && keyTerms.length > 0) {
        question = question.replace('{concept}', keyTerms[0]);
      }
      if (question.includes('{related_topic}')) {
        question = question.replace('{related_topic}', 'the broader context');
      }
      if (question.includes('{alternative}')) {
        question = question.replace('{alternative}', 'similar concepts');
      }
      if (question.includes('{known_fact}')) {
        question = question.replace('{known_fact}', 'established knowledge');
      }

      questions.push({
        type: questionType,
        question,
        context: statement,
      });
    }

    return questions;
  }

  private extractKeyTerms(statement: string): string[] {
    // Simple extraction of potential key terms (nouns and noun phrases)
    const words = statement.split(/\s+/);
    const terms: string[] = [];

    // Look for capitalized words (potential proper nouns or important concepts)
    for (const word of words) {
      if (word.length > 3 && /^[A-Z]/.test(word)) {
        terms.push(word.toLowerCase());
      }
    }

    // If no capitalized words, take the longest words as potential key terms
    if (terms.length === 0) {
      const longWords = words
        .filter((w) => w.length > 5)
        .sort((a, b) => b.length - a.length)
        .slice(0, 3);
      terms.push(...longWords);
    }

    return terms;
  }
}

/**
 * Response Filter
 * Removes sycophantic phrases and replaces with contrarian alternatives
 */
export class ResponseFilter {
  private readonly config: AntiSycophancyConfig;

  constructor(config: AntiSycophancyConfig) {
    this.config = config;
  }

  filterResponse(response: string): string {
    let filtered = response;

    // Apply replacements based on aggressiveness level
    const replacementThreshold = 10 - this.config.aggressiveness; // Higher aggressiveness = more replacements

    for (const [phrase, replacement] of Object.entries(CONTRARIAN_REPLACEMENTS)) {
      const regex = new RegExp(phrase, 'gi');
      if (regex.test(filtered)) {
        // Replace based on aggressiveness
        if (Math.random() * 10 < this.config.aggressiveness) {
          filtered = filtered.replace(regex, replacement);
          if (this.config.verboseLogging) {
            console.log(`Replaced "${phrase}" with "${replacement}"`);
          }
        }
      }
    }

    // Check for remaining sycophantic phrases
    for (const phrase of SYCOPHANTIC_PHRASES) {
      const regex = new RegExp(phrase, 'gi');
      if (regex.test(filtered)) {
        // Remove or replace based on context
        const replacement = this.generateContextualReplacement(phrase);
        filtered = filtered.replace(regex, replacement);
        if (this.config.verboseLogging) {
          console.log(`Filtered sycophantic phrase: "${phrase}"`);
        }
      }
    }

    return filtered;
  }

  private generateContextualReplacement(phrase: string): string {
    const replacements = [
      "Let's examine that more closely",
      'That warrants further analysis',
      'Consider the alternative',
      'The evidence suggests complexity',
      'Multiple perspectives exist here',
    ];

    return replacements[Math.floor(Math.random() * replacements.length)];
  }
}

/**
 * Contrarian Response Enhancer
 * Adds Socratic questions and alternative perspectives
 */
export class ContrarianEnhancer {
  private readonly config: AntiSycophancyConfig;
  private readonly questionGenerator: SocraticQuestionGenerator;

  constructor(config: AntiSycophancyConfig) {
    this.config = config;
    this.questionGenerator = new SocraticQuestionGenerator();
  }

  enhanceResponse(response: string, userMessage: string): string {
    let enhanced = response;

    // Add Socratic questions if enabled
    if (this.config.enableSocraticQuestions) {
      const questions = this.questionGenerator.generateQuestions(userMessage);
      if (questions.length > 0) {
        // Insert questions based on aggressiveness
        const questionCount = Math.ceil(this.config.aggressiveness / 3);
        const selectedQuestions = questions.slice(0, questionCount);

        const questionText = selectedQuestions.map((q) => q.question).join(' ');

        // Add questions strategically within the response
        enhanced = this.insertQuestionsStrategically(enhanced, questionText);
      }
    }

    // Add evidence demands if enabled
    if (this.config.enableEvidenceDemands && this.shouldDemandEvidence(userMessage)) {
      const evidenceDemand = this.generateEvidenceDemand();
      enhanced = `${enhanced}\n\n${evidenceDemand}`;
    }

    // Add alternative perspectives if enabled
    if (this.config.enablePerspectiveMultiplication) {
      const perspectives = this.generateAlternativePerspectives(userMessage);
      if (perspectives.length > 0) {
        enhanced = this.insertPerspectives(enhanced, perspectives);
      }
    }

    return enhanced;
  }

  private insertQuestionsStrategically(response: string, questions: string): string {
    // Find a good insertion point (after first paragraph or mid-response)
    const paragraphs = response.split('\n\n');
    if (paragraphs.length > 1) {
      // Insert after first substantial paragraph
      const insertIndex = Math.min(1, Math.floor(paragraphs.length / 2));
      paragraphs.splice(insertIndex, 0, questions);
      return paragraphs.join('\n\n');
    }

    // If no clear paragraphs, append to end
    return `${response}\n\n${questions}`;
  }

  private shouldDemandEvidence(message: string): boolean {
    // Check if the message contains factual claims
    const factualIndicators = [
      'studies show',
      'research indicates',
      'statistics prove',
      'data suggests',
      'evidence shows',
      'facts demonstrate',
      'always',
      'never',
      'all',
      'none',
      'every',
      '%',
      'percent',
      'majority',
      'most people',
    ];

    const lowerMessage = message.toLowerCase();
    return factualIndicators.some((indicator) => lowerMessage.includes(indicator));
  }

  private generateEvidenceDemand(): string {
    const demands = [
      'What specific studies or data support this claim?',
      'Can you provide concrete evidence for this assertion?',
      'Which sources validate this perspective?',
      'What empirical basis underlies this statement?',
      'How might we verify these claims independently?',
    ];

    return demands[Math.floor(Math.random() * demands.length)];
  }

  private generateAlternativePerspectives(message: string): string[] {
    const perspectives: string[] = [];

    // Generate 1-3 alternative perspectives based on aggressiveness
    const perspectiveCount = Math.min(3, Math.ceil(this.config.aggressiveness / 3));

    const templates = [
      'Alternatively, one might argue that',
      'From another angle, consider that',
      'A contrasting viewpoint suggests',
      'Critics of this position would contend',
      'Historical precedent indicates',
      'Philosophical tradition offers',
    ];

    for (let i = 0; i < perspectiveCount; i++) {
      const template = templates[i % templates.length];
      perspectives.push(`${template} [alternative perspective ${i + 1}]`);
    }

    return perspectives;
  }

  private insertPerspectives(response: string, perspectives: string[]): string {
    // Add perspectives near the end of the response
    const perspectiveText = perspectives.join('. ');
    return `${response}\n\n${perspectiveText}.`;
  }
}

/**
 * Calculate metrics for a response to measure anti-sycophancy
 */
export function calculateContrarianMetrics(
  response: string,
  userMessage: string,
): ContrarianMetrics {
  // Count sycophantic phrases
  let sycophancyCount = 0;
  for (const phrase of SYCOPHANTIC_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    const matches = response.match(regex);
    if (matches) {
      sycophancyCount += matches.length;
    }
  }

  // Count questions (Socratic density)
  const questionCount = (response.match(/\?/g) || []).length;
  const statementCount = response.split(/[.!]/).length;
  const socraticDensity = statementCount > 0 ? questionCount / statementCount : 0;

  // Count evidence demands
  const evidenceKeywords = [
    'evidence',
    'proof',
    'source',
    'study',
    'data',
    'verify',
    'substantiate',
  ];
  let evidenceDemands = 0;
  for (const keyword of evidenceKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (regex.test(response)) {
      evidenceDemands++;
    }
  }

  // Count alternative perspectives
  const perspectiveIndicators = [
    'alternatively',
    'however',
    'on the other hand',
    'another perspective',
    'conversely',
    'in contrast',
    'different view',
    'opposing view',
  ];
  let perspectiveCount = 0;
  for (const indicator of perspectiveIndicators) {
    const regex = new RegExp(indicator, 'gi');
    if (regex.test(response)) {
      perspectiveCount++;
    }
  }

  // Calculate scores
  const responseLength = response.split(/\s+/).length;
  const sycophancyScore = Math.min(1, sycophancyCount / (responseLength / 100));
  const contrarianScore = Math.min(1, (questionCount + evidenceDemands + perspectiveCount) / 10);

  return {
    sycophancyScore,
    contrarianScore,
    socraticDensity,
    evidenceDemands: evidenceDemands / Math.max(1, statementCount),
    perspectiveCount,
  };
}

/**
 * Main anti-sycophancy processor
 */
export class AntiSycophancyProcessor {
  private readonly config: AntiSycophancyConfig;
  private readonly filter: ResponseFilter;
  private readonly enhancer: ContrarianEnhancer;

  constructor(config: Partial<AntiSycophancyConfig> = {}) {
    this.config = {
      aggressiveness: 7,
      enableSocraticQuestions: true,
      enableEvidenceDemands: true,
      enablePerspectiveMultiplication: true,
      verboseLogging: false,
      ...config,
    };

    this.filter = new ResponseFilter(this.config);
    this.enhancer = new ContrarianEnhancer(this.config);
  }

  /**
   * Process a response to remove sycophancy and add contrarian elements
   */
  processResponse(
    response: string,
    userMessage: string,
  ): {
    processedResponse: string;
    metrics: ContrarianMetrics;
  } {
    // Step 1: Filter sycophantic phrases
    let processedResponse = this.filter.filterResponse(response);

    // Step 2: Enhance with contrarian elements
    processedResponse = this.enhancer.enhanceResponse(processedResponse, userMessage);

    // Step 3: Calculate metrics
    const metrics = calculateContrarianMetrics(processedResponse, userMessage);

    if (this.config.verboseLogging) {
      console.log('Anti-sycophancy metrics:', metrics);
    }

    return {
      processedResponse,
      metrics,
    };
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(config: Partial<AntiSycophancyConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current configuration
   */
  getConfig(): AntiSycophancyConfig {
    return { ...this.config };
  }
}
