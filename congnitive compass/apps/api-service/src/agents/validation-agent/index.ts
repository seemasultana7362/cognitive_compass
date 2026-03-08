import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { z } from "zod";
import pino from "pino";
import { BedrockClient } from "../../utils/bedrock-client";
import { Result } from "@cognitive-compass/shared/types";

const MODEL_ID = "amazon.nova-pro-v1:0";
const QUIZ_QUESTION_COUNT = 3;
const MAX_TOKENS = 2048;
const TEMPERATURE = 0.3;

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});

const QuizResponseSchema = z
  .array(QuizQuestionSchema)
  .length(QUIZ_QUESTION_COUNT);

const ExplanationResponseInputSchema = z.object({
  id: z.string(),
  explanation: z.string(),
  keyConcepts: z.array(z.string()),
});

type ExplanationResponseInput = z.infer<typeof ExplanationResponseInputSchema>;

function buildQuizPrompt(
  explanationResponse: ExplanationResponseInput,
): string {
  return `Based on the following code explanation and key concepts, generate exactly ${QUIZ_QUESTION_COUNT} multiple-choice questions to test understanding.

Explanation:
${explanationResponse.explanation}

Key Concepts:
${explanationResponse.keyConcepts.join(", ")}

Return a JSON array with exactly ${QUIZ_QUESTION_COUNT} questions in this exact format:
[
  {
    "question": "What does [concept] do in this code?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Explanation of why this is correct"
  }
]

Return ONLY valid JSON array, no additional text.`;
}

function parseQuizResponse(
  raw: string,
  logger: pino.Logger,
): Result<QuizQuestion[], Error> {
  try {
    const parsed = JSON.parse(raw);
    const result = QuizResponseSchema.safeParse(parsed);

    if (!result.success) {
      logger.error({ error: result.error }, "Quiz parse error");
      return { success: true, data: [] };
    }

    return { success: true, data: result.data };
  } catch (error) {
    logger.error({ error }, "Quiz JSON parse error");
    return { success: true, data: [] };
  }
}

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<
  Result<{ questions: QuizQuestion[]; explanationId: string }, Error>
> {
  const logger = pino({
    name: "validation-agent",
    requestId: context.awsRequestId,
  });

  if (!event.body) {
    return { success: false, error: new Error("Missing request body") };
  }

  const parseResult = ExplanationResponseInputSchema.safeParse(
    JSON.parse(event.body),
  );

  if (!parseResult.success) {
    logger.error({ error: parseResult.error }, "Invalid request body");
    return { success: false, error: new Error(parseResult.error.message) };
  }

  const response = parseResult.data;
  const bedrockClient = BedrockClient.getInstance();

  logger.info({ explanationId: response.id }, "Generating quiz questions");

  const modelResult = await bedrockClient.invokeModel(
    MODEL_ID,
    buildQuizPrompt(response),
    MAX_TOKENS,
    TEMPERATURE,
  );

  if (!modelResult.success) {
    logger.error({ error: modelResult.error }, "Model invocation failed");
    return { success: false, error: modelResult.error };
  }

  const quizResult = parseQuizResponse(modelResult.data, logger);

  logger.info(
    { questionCount: quizResult.data.length },
    "Quiz questions generated",
  );

  return {
    success: true,
    data: {
      questions: quizResult.data,
      explanationId: response.id,
    },
  };
}
