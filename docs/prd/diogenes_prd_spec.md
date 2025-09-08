# Project Diogenes: PRD & Technical Spec
## POC-First Development Strategy

---

## 1. Product Requirements Document (PRD)

### Project Vision
Build a contrarian AI chatbot that challenges assumptions, maintains principles, and provides intellectually honest discourse - delivered through rapid POC iterations.

### Core User Stories
- **As a user**, I want to engage with an AI that challenges my thinking rather than agreeing with everything
- **As a user**, I want consistent philosophical positions that don't shift based on my preferences  
- **As a user**, I want evidence-based responses when claims are made
- **As a developer**, I want to rapidly iterate on contrarian behavior through POCs

### Success Criteria
- POC 1: Working chat with authentication and contrarian responses (1 week)
- POC 2: Multi-model synthesis with challenge scoring (1 week)
- POC 3: Advanced principle enforcement and evidence tracking (1 week)

---

## 2. Technical Specification

### Architecture Overview
```
[Auth Gate] → [Chat Interface] → [Session Manager] → [LLM Gateway] → [Response Processor]
                    ↓
[Manual Session Storage] ← [Conversation History]
```

### POC 1: Foundation (Week 1)

#### Core Components

**Authentication System**
```typescript
// lib/auth.ts
export const DEMO_PASSWORD = "diogenes2024";

export function validateAuth(password: string): boolean {
  return password === DEMO_PASSWORD;
}

export function isAuthenticated(): boolean {
  return localStorage.getItem('diogenes_auth') === 'true';
}
```

**Session Management**
```typescript
// lib/session.ts
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Session {
  id: string;
  messages: Message[];
  created: number;
  lastUpdated: number;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();
  
  createSession(): string {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      id: sessionId,
      messages: [],
      created: Date.now(),
      lastUpdated: Date.now()
    });
    return sessionId;
  }
  
  addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages.push(message);
      session.lastUpdated = Date.now();
    }
  }
  
  getHistory(sessionId: string): Message[] {
    return this.sessions.get(sessionId)?.messages || [];
  }
}
```

**Diogenean System Prompt**
```typescript
// lib/prompts/core-principles.ts
export const DIOGENES_SYSTEM_PROMPT = `
You are Diogenes, a philosopher committed to intellectual honesty and challenging conventional wisdom.

CORE PRINCIPLES:
1. NEVER agree just to be agreeable
2. Challenge unsupported claims with evidence
3. Question underlying assumptions 
4. Maintain consistent logical positions
5. Use Socratic questioning to expose flawed reasoning
6. Present uncomfortable truths when necessary

BEHAVIORAL GUIDELINES:
- Demand evidence for factual claims
- Point out logical inconsistencies respectfully but firmly
- Ask probing questions that encourage deeper thinking
- Maintain principles even when inconvenient
- Avoid sycophantic responses

RESPONSE STYLE:
- Direct and honest
- Evidence-based
- Questioning rather than lecturing
- Constructively challenging
- Philosophically consistent

Remember: Your job is to help users think more clearly, not to make them feel good about poor reasoning.
`;
```

**Streaming Chat API**
```typescript
// app/api/chat/route.ts
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { openai } from '@/lib/openai';
import { DIOGENES_SYSTEM_PROMPT } from '@/lib/prompts/core-principles';

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json();
  
  // Construct full conversation history
  const fullMessages = [
    { role: 'system', content: DIOGENES_SYSTEM_PROMPT },
    ...messages
  ];
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: fullMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 800,
  });
  
  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
```

#### File Structure
```
diogenes/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts
│   │   ├── chat/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── AuthGate.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── MessageBubble.tsx
│   │   └── InputForm.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── session.ts
│   │   ├── openai.ts
│   │   └── prompts/
│   │       └── core-principles.ts
│   └── types/
│       └── chat.ts
├── package.json
├── tailwind.config.js
└── next.config.js
```

#### Environment Setup
```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Installation Commands
```bash
npx create-next-app@latest diogenes --typescript --tailwind --app
cd diogenes
npm install ai openai uuid
npm install -D @types/uuid
```

---

### POC 2: Multi-Model Integration (Week 2)

#### Enhanced Chat API with Multiple Models
```typescript
// lib/models/manager.ts
interface ModelResponse {
  content: string;
  model: string;
  principleScore: number;
  challengeLevel: number;
}

class MultiModelManager {
  async getResponses(messages: any[]): Promise<ModelResponse[]> {
    const models = ['gpt-4', 'claude-3-sonnet', 'gemini-pro'];
    
    const responses = await Promise.all(
      models.map(model => this.getSingleResponse(messages, model))
    );
    
    return responses;
  }
  
  async synthesizeResponse(responses: ModelResponse[]): Promise<string> {
    // Score responses based on principle adherence and challenge level
    const bestResponse = responses.reduce((best, current) => 
      current.principleScore > best.principleScore ? current : best
    );
    
    return bestResponse.content;
  }
}
```

#### Principle Scoring Engine
```typescript
// lib/evaluation/principles.ts
export function scorePrincipleAdherence(content: string): number {
  let score = 0;
  
  // Check for evidence requests
  if (content.includes('evidence') || content.includes('source')) score += 20;
  
  // Check for questions (Socratic method)
  const questionCount = (content.match(/\?/g) || []).length;
  score += Math.min(questionCount * 10, 30);
  
  // Check for challenge indicators
  const challengeWords = ['however', 'but', 'actually', 'consider', 'what if'];
  challengeWords.forEach(word => {
    if (content.toLowerCase().includes(word)) score += 10;
  });
  
  // Penalize agreement words
  const agreeWords = ['absolutely', 'exactly', 'you\'re right', 'great point'];
  agreeWords.forEach(word => {
    if (content.toLowerCase().includes(word)) score -= 15;
  });
  
  return Math.max(0, Math.min(100, score));
}
```

---

### POC 3: Advanced Features (Week 3)

#### Evidence Tracking System
```typescript
// lib/evidence/tracker.ts
interface EvidenceRequest {
  claim: string;
  requestedAt: number;
  fulfilled: boolean;
}

class EvidenceTracker {
  private requests: Map<string, EvidenceRequest[]> = new Map();
  
  addRequest(sessionId: string, claim: string): void {
    const requests = this.requests.get(sessionId) || [];
    requests.push({
      claim,
      requestedAt: Date.now(),
      fulfilled: false
    });
    this.requests.set(sessionId, requests);
  }
  
  getPendingRequests(sessionId: string): EvidenceRequest[] {
    return this.requests.get(sessionId)?.filter(r => !r.fulfilled) || [];
  }
}
```

#### Conversation Analysis
```typescript
// lib/analysis/conversation.ts
export function analyzeConversationPatterns(messages: Message[]): {
  userClaimCount: number;
  evidenceProvidedCount: number;
  challengesIssued: number;
  principleConsistency: number;
} {
  // Analyze conversation for principle adherence and improvement opportunities
  // Return metrics for session evaluation
}
```

---

## 3. Development Roadmap

### Week 1: Foundation POC
- [x] Project setup with Next.js 15
- [x] Fixed password authentication
- [x] Basic chat interface with streaming
- [x] Core Diogenean system prompt
- [x] Manual session management
- [x] Vercel deployment

### Week 2: Multi-Model POC  
- [ ] Vercel AI SDK integration
- [ ] Multiple model response gathering
- [ ] Principle scoring system
- [ ] Response synthesis algorithm
- [ ] Challenge level measurement

### Week 3: Advanced POC
- [ ] Evidence tracking system
- [ ] Conversation pattern analysis
- [ ] Enhanced principle enforcement
- [ ] Session analytics dashboard
- [ ] Performance optimization

---

## 4. Testing Strategy

### Manual Testing Scenarios
1. **Principle Adherence**: Present obviously flawed arguments and verify challenges
2. **Evidence Demands**: Make unsupported claims and verify evidence requests
3. **Consistency**: Test same philosophical questions across sessions
4. **Challenge Effectiveness**: Measure user engagement and thinking depth

### Automated Tests
```typescript
// __tests__/principles.test.ts
describe('Principle Engine', () => {
  test('should score challenging responses higher', () => {
    const challenge = "What evidence supports that claim?";
    const agreement = "That's absolutely correct!";
    
    expect(scorePrincipleAdherence(challenge)).toBeGreaterThan(
      scorePrincipleAdherence(agreement)
    );
  });
});
```

---

## 5. Deployment Configuration

### Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "app/api/chat/route.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "OPENAI_API_KEY": "@openai-api-key"
  }
}
```

### Performance Targets
- **Response Time**: <2 seconds for single model, <5 seconds for multi-model
- **Principle Score**: >70 average across conversations
- **User Engagement**: >5 messages per session average

---

## 6. Risk Mitigation

### Technical Risks
- **API Rate Limits**: Implement request queuing and fallbacks
- **Model Availability**: Multiple provider redundancy
- **Session Storage**: Client-side storage with server backup option

### Product Risks  
- **Over-Aggressiveness**: Implement "challenge level" controls
- **User Frustration**: Provide context on Diogenean philosophy
- **Principle Rigidity**: Allow nuanced positions within core framework

---

This specification prioritizes rapid iteration and functional POCs while maintaining the core philosophical principles of Project Diogenes. Each POC builds incrementally toward a robust contrarian AI system.