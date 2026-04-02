import amqp from "amqplib";
import type { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import { env } from "../config/env.ts";

type EmailQueueJob = {
  campaignId: string;
};

type EmailQueueHealth = {
  ok: boolean;
  url: string;
  queueName: string;
  connected: boolean;
  consumerStarted: boolean;
  error: string | null;
};

let queueConnection: ChannelModel | null = null;
let queueChannel: Channel | null = null;
let consumerStarted = false;
let lastQueueError: string | null = null;

function formatQueueError(error: unknown) {
  if (error instanceof Error) {
    const code =
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code?: string }).code
        : null;
    const message = error.message?.trim() || "Unknown RabbitMQ error.";
    return code ? `${code}: ${message}` : message;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const maybeCode =
      "code" in error && typeof error.code === "string" ? error.code : null;
    const maybeMessage =
      "message" in error && typeof error.message === "string"
        ? error.message.trim()
        : "";

    if (maybeCode || maybeMessage) {
      return [maybeCode, maybeMessage || "Unknown RabbitMQ error."]
        .filter(Boolean)
        .join(": ");
    }
  }

  return "Unknown RabbitMQ error.";
}

function buildQueueUnavailableError(error: unknown) {
  const detail = formatQueueError(error);
  return `Tidak bisa terhubung ke RabbitMQ di ${env.rabbitmqUrl} untuk queue "${env.emailQueueName}". ${detail} Pastikan service RabbitMQ sedang berjalan dan kredensial URL benar.`;
}

async function ensureQueueChannel() {
  if (queueChannel) {
    return queueChannel;
  }

  try {
    const connection = await amqp.connect(env.rabbitmqUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(env.emailQueueName, {
      durable: true,
    });

    await channel.prefetch(Math.max(env.emailQueuePrefetch, 1));

    connection.on("close", () => {
      queueConnection = null;
      queueChannel = null;
      consumerStarted = false;
      lastQueueError =
        'Koneksi RabbitMQ terputus. Pastikan broker tetap berjalan.';
      console.warn("[QUEUE] RabbitMQ connection closed.");
    });

    connection.on("error", (error: unknown) => {
      lastQueueError = buildQueueUnavailableError(error);
      console.error("[QUEUE] RabbitMQ connection error:", error);
    });

    queueConnection = connection;
    queueChannel = channel;
    lastQueueError = null;
    return channel;
  } catch (error) {
    const nextMessage = buildQueueUnavailableError(error);
    lastQueueError = nextMessage;
    throw new Error(nextMessage);
  }
}

function parseJobMessage(message: ConsumeMessage): EmailQueueJob {
  const rawPayload = message.content.toString("utf8");
  const parsedPayload = JSON.parse(rawPayload) as Partial<EmailQueueJob>;

  if (!parsedPayload.campaignId || typeof parsedPayload.campaignId !== "string") {
    throw new Error("Queue payload campaignId tidak valid.");
  }

  return {
    campaignId: parsedPayload.campaignId,
  };
}

export async function enqueueCommunicationCampaignJob(job: EmailQueueJob) {
  const channel = await ensureQueueChannel();
  const wasQueued = channel.sendToQueue(
    env.emailQueueName,
    Buffer.from(JSON.stringify(job)),
    {
      contentType: "application/json",
      persistent: true,
    },
  );

  if (!wasQueued) {
    lastQueueError =
      "RabbitMQ queue sedang penuh. Coba kirim ulang beberapa saat lagi.";
    throw new Error(lastQueueError);
  }
}

export async function verifyEmailQueueConnection(): Promise<EmailQueueHealth> {
  try {
    await ensureQueueChannel();
    return {
      ok: true,
      url: env.rabbitmqUrl,
      queueName: env.emailQueueName,
      connected: true,
      consumerStarted,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : buildQueueUnavailableError(error);

    return {
      ok: false,
      url: env.rabbitmqUrl,
      queueName: env.emailQueueName,
      connected: false,
      consumerStarted,
      error: message,
    };
  }
}

export function getEmailQueueHealthSnapshot(): EmailQueueHealth {
  return {
    ok: Boolean(queueChannel),
    url: env.rabbitmqUrl,
    queueName: env.emailQueueName,
    connected: Boolean(queueChannel),
    consumerStarted,
    error: lastQueueError,
  };
}

export async function startEmailCampaignConsumer(
  onMessage: (job: EmailQueueJob) => Promise<void>,
) {
  if (consumerStarted) {
    return;
  }

  const channel = await ensureQueueChannel();

  await channel.consume(
    env.emailQueueName,
    async (message: ConsumeMessage | null) => {
      if (!message) {
        return;
      }

      try {
        const job = parseJobMessage(message);
        await onMessage(job);
        channel.ack(message);
      } catch (error) {
        console.error("[QUEUE] Failed to process message:", error);
        channel.ack(message);
      }
    },
  );

  consumerStarted = true;
  lastQueueError = null;
  console.log(
    `[QUEUE] Email consumer ready on queue "${env.emailQueueName}" via ${env.rabbitmqUrl}.`,
  );
}

export async function closeEmailQueueConnection() {
  await queueChannel?.close().catch(() => undefined);
  await queueConnection?.close().catch(() => undefined);
  queueChannel = null;
  queueConnection = null;
  consumerStarted = false;
}
