/**
 * @file utils/llmClient.ts
 * @description Simple reusable LLM client (chat completions).
 */

import { env } from "../config/env";

export type LlmChatMessage = {
  role: "system" | "developer" | "user" | "assistant";
  content: string;
};

export class LlmClientError extends Error {
  statusCode = 400;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function chat(messages: LlmChatMessage[]): Promise<string> {
  if (!env.llmBaseUrl || !env.llmApiKey || !env.llmModel) {
    throw new LlmClientError("LLM is not configured");
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
        const shouldRetry =
          response.status === 429 || response.status >= 500;
        if (shouldRetry && attempt < maxRetries) {
          await sleep(retryDelayMs);
          continue;
        }
        throw new Error(`LLM request failed: ${response.status} ${text}`);
      }

      const data = await response.json();
      return String(
        data?.choices?.[0]?.message?.content ??
          data?.choices?.[0]?.message?.text ??
          "",
      );
    } catch (error) {
      const isAbort =
        error instanceof Error && error.name === "AbortError";
      if (isAbort && attempt < maxRetries) {
        await sleep(retryDelayMs);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  return "";
}
