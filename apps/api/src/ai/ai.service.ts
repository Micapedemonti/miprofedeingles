import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { GeneratedLessonSchema, GeneratedLesson } from './lesson.schema';

const TUTOR_METHOD = `
You are a personal English tutor for an adult learner whose native language is Spanish and who lives in Chile. She takes one class a week with a human teacher; you complement that class. Her goal is to speak English fluently and understand spoken English. Listening is her hardest skill.
English content: natural, everyday spoken English at her CEFR level (slightly above it is fine). Use contractions and real phrasing.
Explanations, tips and summaries: short, simple, neutral Latin American Spanish. One idea per tip, with an example.
Be warm but honest. Never call a mistake correct. Do not over-praise.
Recycle what she struggles with: target weak points on purpose and connect to what she saw in her weekly class.
Classify every mistake into exactly ONE category key.
Vocabulary difficulty must come from how English SOUNDS (contractions, weak forms, linking, final sounds, numbers), never from rare words.
A1-A2: common everyday words, 4-9 words per sentence, no idioms or technical terms.
B1: common vocabulary, 6-12 words. B2: everyday natural vocabulary, 8-14 words.
Return only the requested structured object.
`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly provider: 'gemini' | 'openai';
  private readonly fallbackModel: string | null = null;

  constructor(config: ConfigService) {
    const geminiKey = config.get<string>('GEMINI_API_KEY');
    const openaiKey = config.get<string>('OPENAI_API_KEY');
    if (geminiKey) {
      // Gemini exposes an OpenAI-compatible Chat Completions endpoint.
      this.provider = 'gemini';
      this.client = new OpenAI({ apiKey: geminiKey, baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/' });
      this.model = config.get<string>('GEMINI_MODEL', 'gemini-3.5-flash');
      this.fallbackModel = config.get<string>('GEMINI_FALLBACK_MODEL', 'gemini-3.5-flash-lite');
    } else {
      this.provider = 'openai';
      this.client = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
      this.model = config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
    }
  }

  async generateLesson(input: {
    unitId: string;
    lessonType: string;
    level: 'A1' | 'A2' | 'B1' | 'B2';
    interests: string[];
    goal: string;
    weaknesses: Array<{ category: string; count: number; examples: unknown }>;
    classNotes: Array<{ title: string; content: string; topics: string[] }>;
  }): Promise<GeneratedLesson> {
    if (!this.client) {
      throw new ServiceUnavailableException('Falta GEMINI_API_KEY u OPENAI_API_KEY en el archivo .env.');
    }

    const exerciseMix: Record<string, string> = {
      LISTENING: '3 LISTEN_CHOICE, 2 DICTATION, 2 FILL_GAP, 1 WORD_ORDER',
      KEY_WORDS: '4 VOCABULARY, 2 FILL_GAP, 2 LISTEN_CHOICE',
      SAY_THE_PHRASE: '4 SPEAK_ALOUD, 2 WORD_ORDER, 1 LISTEN_CHOICE',
      CONVERSATION: 'Create 7 or 8 short exercises that prepare a roleplay, emphasizing listening and speaking.',
      REVIEW: '2 LISTEN_CHOICE, 2 DICTATION, 2 FILL_GAP, 1 WORD_ORDER, 1 SPEAK_ALOUD',
    };

    const context = {
      unitId: input.unitId,
      lessonType: input.lessonType,
      level: input.level,
      interests: input.interests,
      goal: input.goal,
      topWeaknesses: input.weaknesses.slice(0, 3),
      recentClassNotes: input.classNotes.slice(0, 5),
      requiredMix: exerciseMix[input.lessonType] ?? exerciseMix.LISTENING,
    };

    const userPrompt = `Generate one lesson as structured data. Context: ${JSON.stringify(context)}.
Requirements:
- Exactly 7 or 8 exercises.
- Exercise type names must match the schema.
- Each exercise includes instruction, English text, brief Spanish translation, one short Spanish tip, one focus category or null, options or null, and correctAnswer.
- For LISTEN_CHOICE, FILL_GAP and VOCABULARY use exactly 3 options and ensure correctAnswer is exactly one option.
- Distractors must be plausible and contrast a sound or one relevant word, not obscure vocabulary.
- For DICTATION and SPEAK_ALOUD, options and tokens must be null.
- For WORD_ORDER, options must be null, tokens must contain the shuffled words to arrange, and correctAnswer must be the complete target sentence.
- For LISTEN_CHOICE, FILL_GAP and VOCABULARY, tokens must be null.
- Do not reveal learner personal data in exercise text.
- Required mix: ${context.requiredMix}.`;
    const format = zodTextFormat(GeneratedLessonSchema, 'generated_lesson');

    try {
      if (this.provider === 'gemini') {
        return await this.generateWithGemini(this.client, userPrompt, format.schema);
      }
      const response = await this.client.responses.parse({
        model: this.model,
        input: [
          { role: 'system', content: TUTOR_METHOD },
          { role: 'user', content: userPrompt },
        ],
        text: { format },
      });
      const parsed = response.output_parsed;
      if (!parsed) throw new Error('OpenAI returned no parsed output.');
      return GeneratedLessonSchema.parse(parsed);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(`Lesson generation failed: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof OpenAI.APIError && (error.status === 401 || error.status === 403 || /api key/i.test(error.message))) {
        const name = this.provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
        throw new ServiceUnavailableException(`La ${name} no es válida. Revisa la clave en .env y reinicia la API.`);
      }
      if (error instanceof OpenAI.APIError && error.status === 429) {
        throw new ServiceUnavailableException('El proveedor de IA rechazó la solicitud por límite de uso o falta de crédito. Espera un momento e intenta de nuevo.');
      }
      if (error instanceof OpenAI.APIError && error.status === 503) {
        throw new ServiceUnavailableException('El modelo de IA está saturado en este momento. Intenta de nuevo en un minuto.');
      }
      if (error instanceof OpenAI.APIError && error.status === 404) {
        throw new ServiceUnavailableException('El modelo de IA configurado no existe. Revisa GEMINI_MODEL u OPENAI_MODEL en .env.');
      }
      throw new ServiceUnavailableException('No pudimos generar una lección válida. Intenta nuevamente.');
    }
  }

  /** Gemini's JSON-schema support differs from OpenAI's, so ask for JSON and validate with Zod (one retry). */
  private async generateWithGemini(client: OpenAI, userPrompt: string, schema: unknown): Promise<GeneratedLesson> {
    let lastError: unknown;
    let model = this.model;
    for (let attempt = 1; attempt <= 2; attempt++) {
      let completion: OpenAI.Chat.Completions.ChatCompletion;
      try {
        completion = await this.geminiCompletion(client, model, userPrompt, schema);
      } catch (error) {
        // The primary model is sometimes overloaded (503); fall back to the lighter one.
        const overloaded = error instanceof OpenAI.APIError && (error.status === 503 || error.status === 429);
        if (!overloaded || !this.fallbackModel || model === this.fallbackModel) throw error;
        this.logger.warn(`${model} unavailable (${(error as InstanceType<typeof OpenAI.APIError>).status}); retrying with ${this.fallbackModel}.`);
        model = this.fallbackModel;
        completion = await this.geminiCompletion(client, model, userPrompt, schema);
      }
      const raw = completion.choices[0]?.message?.content ?? '';
      try {
        return GeneratedLessonSchema.parse(JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, '')));
      } catch (error) {
        lastError = error;
        this.logger.warn(`Gemini output failed validation (attempt ${attempt}).`);
      }
    }
    throw lastError;
  }

  private geminiCompletion(client: OpenAI, model: string, userPrompt: string, schema: unknown) {
    return client.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: TUTOR_METHOD },
        {
          role: 'user',
          content: `${userPrompt}\nReturn ONLY a JSON object that matches this JSON Schema exactly:\n${JSON.stringify(schema)}`,
        },
      ],
    });
  }
}
