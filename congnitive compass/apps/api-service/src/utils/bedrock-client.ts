import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseCommandInput,
  ConverseCommandOutput,
  InvokeModelCommand,
  InvokeModelCommandInput,
  InvokeModelCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  InvokeAgentCommandInput,
  InvokeAgentCommandOutput,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { Result } from "@cognitive-compass/shared/types";

const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;
const BACKOFF_MULTIPLIER = 2;
const TITAN_EMBED_MODEL_ID = "amazon.titan-embed-text-v2:0";
const TITAN_EMBED_MAX_CHARS = 8192;

export class BedrockClient {
  private static instance: BedrockClient;
  private readonly runtimeClient: BedrockRuntimeClient;
  private readonly agentRuntimeClient: BedrockAgentRuntimeClient;

  private constructor() {
    this.runtimeClient = new BedrockRuntimeClient({});
    this.agentRuntimeClient = new BedrockAgentRuntimeClient({});
  }

  public static getInstance(): BedrockClient {
    if (!BedrockClient.instance) {
      BedrockClient.instance = new BedrockClient();
    }
    return BedrockClient.instance;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableError(error: unknown): boolean {
    if (error && typeof error === "object" && "name" in error) {
      const errorName = (error as { name: string }).name;
      return (
        errorName === "ThrottlingException" ||
        errorName === "ServiceUnavailableException"
      );
    }
    return false;
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
  ): Promise<Result<T, Error>> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await operation();
        return { success: true, data: result };
      } catch (error) {
        lastError = error as Error;
        if (this.isRetryableError(error) && attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = BASE_RETRY_DELAY_MS * BACKOFF_MULTIPLIER ** attempt;
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError || new Error("Unknown error occurred"),
    };
  }

  public async invokeModel(
    modelId: string,
    prompt: string,
    maxTokens: number,
    temperature: number,
  ): Promise<Result<string, Error>> {
    const input: ConverseCommandInput = {
      modelId,
      messages: [
        {
          role: "user",
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens,
        temperature,
      },
    };

    const result = await this.withRetry<ConverseCommandOutput>(async () => {
      return this.runtimeClient.send(new ConverseCommand(input));
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const output: ConverseCommandOutput = result.data;
    if (
      !output.output ||
      !output.output.message ||
      !output.output.message.content ||
      output.output.message.content.length === 0
    ) {
      return { success: false, error: new Error("Invalid response structure") };
    }

    const content = output.output.message.content[0];
    if (!("text" in content)) {
      return { success: false, error: new Error("Expected text content") };
    }

    return { success: true, data: content.text };
  }

  public async invokeAgent(
    agentId: string,
    agentAliasId: string,
    sessionId: string,
    inputText: string,
  ): Promise<Result<string, Error>> {
    const input: InvokeAgentCommandInput = {
      agentId,
      agentAliasId,
      sessionId,
      inputText,
    };

    const result = await this.withRetry<InvokeAgentCommandOutput>(async () => {
      return this.agentRuntimeClient.send(new InvokeAgentCommand(input));
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const response = result.data;
    if (!response.completion) {
      return { success: false, error: new Error("No completion in response") };
    }

    let accumulated = "";
    const decoder = new TextDecoder();
    for await (const chunk of response.completion as AsyncIterable<{
      chunk?: { bytes?: Uint8Array };
    }>) {
      if (chunk.chunk?.bytes) {
        accumulated += decoder.decode(chunk.chunk.bytes, { stream: true });
      }
    }

    return { success: true, data: accumulated };
  }

  public async generateEmbedding(
    text: string,
  ): Promise<Result<number[], Error>> {
    const truncatedText = text.substring(0, TITAN_EMBED_MAX_CHARS);

    const input: InvokeModelCommandInput = {
      modelId: TITAN_EMBED_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputText: truncatedText }),
    };

    const result = await this.withRetry<InvokeModelCommandOutput>(async () => {
      return this.runtimeClient.send(new InvokeModelCommand(input));
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const response = result.data;
    if (!response.body) {
      return { success: false, error: new Error("No body in response") };
    }

    const decoder = new TextDecoder();
    const bodyStr = decoder.decode(response.body);
    const parsed = JSON.parse(bodyStr);

    if (!parsed.embedding || !Array.isArray(parsed.embedding)) {
      return { success: false, error: new Error("Invalid embedding response") };
    }

    return { success: true, data: parsed.embedding as number[] };
  }
}
