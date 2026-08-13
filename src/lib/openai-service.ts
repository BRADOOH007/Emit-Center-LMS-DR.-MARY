import { callAI, type AIMessage } from '@/lib/ai-provider';
import { cleanAiJson } from '@/lib/ai-generation-utils';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OpenAIService {
  static async generateText(
    messages: OpenAIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      useReasoner?: boolean;
    },
  ): Promise<string> {
    const result = await callAI({
      messages: messages as AIMessage[],
      maxTokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
      useReasoner: options?.useReasoner ?? false,
    });
    console.log(`[AI] ${result.provider}/${result.model} — ${result.latencyMs}ms, ${result.tokensUsed ?? '?'} tokens`);
    return result.content;
  }

  static async generateTextDetailed(
    messages: OpenAIMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      useReasoner?: boolean;
    },
  ): Promise<{ content: string; provider: string; model: string; tokensUsed?: number; latencyMs?: number }> {
    const result = await callAI({
      messages: messages as AIMessage[],
      maxTokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
      useReasoner: options?.useReasoner ?? false,
    });
    console.log(`[AI] ${result.provider}/${result.model} — ${result.latencyMs}ms, ${result.tokensUsed ?? '?'} tokens`);
    return result;
  }

  static async generateLongContent(
    messages: OpenAIMessage[],
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<string> {
    return this.generateText(messages, {
      maxTokens: options?.maxTokens ?? 3000,
      temperature: options?.temperature ?? 0.7,
    });
  }

  static async generateWithReasoning(
    messages: OpenAIMessage[],
    options?: { maxTokens?: number },
  ): Promise<string> {
    return this.generateText(messages, {
      maxTokens: options?.maxTokens ?? 2000,
      useReasoner: true,
    });
  }

  static async generateAIContent(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<string> {
    return this.generateText([{ role: 'user', content: prompt }], options);
  }

  static async generateAIAssignment(data: {
    subject: string;
    topic: string;
    difficulty: string;
    duration: number;
    description?: string;
    studentLevel: string;
    learningStyle: string;
    studentName: string;
  }): Promise<any> {
    const subject = (data.subject || '').trim() || 'General Studies';
    const topic = (data.topic || '').trim() || 'General Knowledge';
    const difficulty = (data.difficulty || '').trim() || 'medium';
    const duration = typeof data.duration === 'number' && data.duration > 0 ? data.duration : 7;

    const isMathSubject =
      subject.toLowerCase().includes('math') ||
      subject.toLowerCase().includes('algebra') ||
      subject.toLowerCase().includes('geometry') ||
      subject.toLowerCase().includes('calculus') ||
      subject.toLowerCase().includes('arithmetic');

    const systemPrompt = `You are a warm, friendly teacher creating personalized assignments for students. Your assignments should feel like a caring teacher is talking directly to the student.

Student Information:
- Name: ${data.studentName}
- Subject: ${subject}
- Topic: ${topic}
- Level: ${data.studentLevel}
- Learning Style: ${data.learningStyle}
- Difficulty: ${difficulty}
- Duration: ${duration} days

FORMATTING REQUIREMENTS:
1. Use warm, encouraging language
2. Include emojis in headings (📚 ✏️ 🤔 💪)
3. Address the student directly ("you", "your")
4. Add encouraging phrases throughout
5. Make it visually friendly with clear sections

${isMathSubject ? `
MATHEMATICS ASSIGNMENT FORMAT:
- Include 8-12 clear mathematical problems
- Use proper mathematical notation
- Show problems like: "Question 1: Calculate 25 × 4 = _____"
- Include word problems with real-life scenarios
- Add "Show your work" reminders
- Mix problem types: calculations, word problems, applications
- Include one challenge problem for extra credit
` : ''}

Create an assignment in the following JSON format:
{
  "title": "Friendly, engaging title",
  "description": "Warm introduction that motivates the student",
  "instructions": "Step-by-step instructions in friendly language",
  "objectives": ["What you'll learn 1", "What you'll learn 2", "What you'll learn 3"],
  "requirements": ["What you need", "How to submit"],
  "resources": ["Helpful resource 1", "Helpful resource 2"],
  "rubric": {
    "excellent": "Amazing work! You've mastered this!",
    "good": "Great job! You're doing well!",
    "satisfactory": "Good effort! Keep practicing!",
    "needsImprovement": "You're learning! Let's work on this together."
  },
  "content": "Full assignment with warm greeting, clear questions/problems, and encouraging closing",
  "estimatedTime": "${duration} days",
  "difficulty": "${difficulty}",
  "learningOutcomes": ["Skill you'll develop 1", "Skill you'll develop 2"]
}`;

    const userPrompt = `Create a warm, friendly, and engaging assignment for ${data.studentName} about ${topic} in ${subject}. Make it feel personal and encouraging. Use ${data.learningStyle} learning approaches. The assignment should be ${difficulty} level and take about ${duration} days to complete.

${data.description ? `Teacher's special notes: ${data.description}` : ''}

Remember: Be warm, encouraging, and make the student feel supported!`;

    const response = await this.generateText(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 2500, temperature: 0.7 },
    );

    try {
      const cleaned = cleanAiJson(response);
      if (cleaned) {
        const parsed = JSON.parse(cleaned);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (error) {
      console.error('Failed to parse AI response as JSON:', error);
    }

    return {
      title: `${topic} - ${subject} Assignment`,
      description: `Complete this assignment on ${topic} in ${subject}`,
      instructions: `1. Research the topic thoroughly\n2. Complete all required tasks\n3. Submit your work on time`,
      objectives: [`Understand ${topic}`, `Apply knowledge practically`, `Demonstrate learning`],
      requirements: ['Original work', 'Proper citations', 'On-time submission'],
      resources: ['Textbook', 'Online resources', 'Library materials'],
      rubric: {
        excellent: 'Exceeds expectations',
        good: 'Meets expectations',
        satisfactory: 'Meets basic requirements',
        needsImprovement: 'Below expectations',
      },
      content: `This assignment focuses on ${topic} in ${subject}. You will explore key concepts and apply your knowledge.`,
      estimatedTime: `${duration} days`,
      difficulty,
      learningOutcomes: ['Enhanced understanding', 'Practical application', 'Critical thinking'],
    };
  }
}