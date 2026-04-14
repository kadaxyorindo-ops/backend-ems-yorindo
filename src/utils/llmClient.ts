/**
 * @file utils/llmClient.ts
 * @description Simple reusable LLM client (chat completions).
 */

import { env } from "../config/env.ts";

export type LlmChatMessage = {
  role: "system" | "developer" | "user" | "assistant";
  content: string;
};

export class LlmClientError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "LlmClientError";
    this.statusCode = statusCode;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function chat(messages: LlmChatMessage[]): Promise<string> {
  if (!env.llmBaseUrl || !env.llmApiKey || !env.llmModel) {
    throw new LlmClientError(
      "LLM is not configured. Please set LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL.",
      503,
    );
  }

  const maxRetries = Math.max(0, env.llmRetryAttempts);
  const retryDelayMs = Math.max(0, env.llmRetryDelayMs);

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.llmTimeoutMs);

    try {
      const response = await fetch(`${env.llmBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.llmApiKey}`,
        },
        body: JSON.stringify({
          model: env.llmModel,
          messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        const shouldRetry = response.status === 429 || response.status >= 500;
        if (shouldRetry && attempt < maxRetries) {
          await sleep(retryDelayMs);
          continue;
        }
        throw new LlmClientError(
          `LLM request failed: ${response.status} ${text}`,
          response.status === 429 ? 429 : 502,
        );
      }

      const data = await response.json();
      return String(
        data?.choices?.[0]?.message?.content ??
          data?.choices?.[0]?.message?.text ??
          "",
      );
    } catch (error) {
      if (error instanceof LlmClientError) {
        throw error;
      }

      const isAbort = error instanceof Error && error.name === "AbortError";
      if (isAbort && attempt < maxRetries) {
        await sleep(retryDelayMs);
        continue;
      }

      if (isAbort) {
        throw new LlmClientError(
          "LLM request timed out. Please try again in a moment.",
          504,
        );
      }

      const errorCode =
        error &&
        typeof error === "object" &&
        "cause" in error &&
        (error as { cause?: { code?: string } }).cause?.code
          ? String((error as { cause?: { code?: string } }).cause?.code)
          : "";

      if (errorCode === "ECONNREFUSED") {
        throw new LlmClientError(
          `Cannot connect to LLM provider at ${env.llmBaseUrl}. Check LLM_BASE_URL and provider availability.`,
          503,
        );
      }

      throw new LlmClientError(
        "Failed to reach LLM provider. Please check network and LLM configuration.",
        503,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return "";
}
