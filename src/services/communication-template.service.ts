import { env } from "../config/env.ts";

export const COMMUNICATION_EMAIL_TEMPLATE_IDS = [
  "executive_brief",
  "event_spotlight",
  "minimal_notice",
] as const;

export type CommunicationEmailTemplateId =
  (typeof COMMUNICATION_EMAIL_TEMPLATE_IDS)[number];

type CommunicationTemplateDefinition = {
  id: CommunicationEmailTemplateId;
  name: string;
  description: string;
  accent: string;
};

type RenderCommunicationEmailInput = {
  templateId: CommunicationEmailTemplateId;
  subject: string;
  previewText?: string | null;
  bodyHtml: string;
  bodyText?: string | null;
  recipientName: string;
  recipientEmail: string;
  eventTitle?: string | null;
  eventDate?: Date | string | null;
};

export type RenderCommunicationEmailResult = {
  template: CommunicationTemplateDefinition;
  subject: string;
  previewText: string;
  html: string;
  text: string;
};

const TEMPLATE_DEFINITIONS: Record<
  CommunicationEmailTemplateId,
  CommunicationTemplateDefinition
> = {
  executive_brief: {
    id: "executive_brief",
    name: "Executive Brief",
    description: "Formal layout with a strong header for operational updates.",
    accent: "#173b80",
  },
  event_spotlight: {
    id: "event_spotlight",
    name: "Event Spotlight",
    description: "More expressive card layout for campaign-style announcements.",
    accent: "#d97706",
  },
  minimal_notice: {
    id: "minimal_notice",
    name: "Minimal Notice",
    description: "A compact, plainspoken template for concise updates.",
    accent: "#0f172a",
  },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeMessageHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .trim();
}

function normalizePreviewText(
  previewText: string | null | undefined,
  bodyText: string | null | undefined,
  bodyHtml: string,
) {
  const directValue = previewText?.trim();

  if (directValue) {
    return directValue;
  }

  const fallback = (bodyText?.trim() || stripHtml(bodyHtml)).slice(0, 140).trim();
  return fallback || "Update terbaru dari tim Yorindo EMS.";
}

function formatEventDate(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  const dateValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dateValue);
}

function buildEmailShell(params: {
  accent: string;
  eyebrow: string;
  heading: string;
  previewText: string;
  eventTitle: string | null;
  eventDateLabel: string | null;
  bodyHtml: string;
  footerNote: string;
  cardStyle: string;
  headerStyle: string;
  bodyStyle: string;
}) {
  const safeEyebrow = escapeHtml(params.eyebrow);
  const safeHeading = escapeHtml(params.heading);
  const safePreviewText = escapeHtml(params.previewText);
  const safeEventTitle = params.eventTitle ? escapeHtml(params.eventTitle) : null;
  const safeEventDate = params.eventDateLabel
    ? escapeHtml(params.eventDateLabel)
    : null;
  const safeFooter = escapeHtml(params.footerNote);

  return `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${safePreviewText}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f8fafc;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;${params.cardStyle}">
            <tr>
              <td style="${params.headerStyle}">
                <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${params.accent};">
                  ${safeEyebrow}
                </p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#0f172a;">
                  ${safeHeading}
                </h1>
              </td>
            </tr>
            ${
              safeEventTitle || safeEventDate
                ? `<tr>
              <td style="padding:0 32px 0;">
                <div style="border:1px dashed #cbd5e1;border-radius:18px;background:#f8fafc;padding:16px 18px;">
                  ${
                    safeEventTitle
                      ? `<p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">${safeEventTitle}</p>`
                      : ""
                  }
                  ${
                    safeEventDate
                      ? `<p style="margin:${safeEventTitle ? "6px" : "0"} 0 0;font-size:13px;line-height:1.6;color:#475569;">${safeEventDate}</p>`
                      : ""
                  }
                </div>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="${params.bodyStyle}">
                ${params.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.8;color:#64748b;">
                  ${safeFooter}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function getCommunicationEmailTemplate(
  templateId: CommunicationEmailTemplateId,
) {
  return TEMPLATE_DEFINITIONS[templateId];
}

export function listCommunicationEmailTemplates() {
  return COMMUNICATION_EMAIL_TEMPLATE_IDS.map((templateId) =>
    getCommunicationEmailTemplate(templateId),
  );
}

export function renderCommunicationEmail(
  input: RenderCommunicationEmailInput,
): RenderCommunicationEmailResult {
  const template = getCommunicationEmailTemplate(input.templateId);
  const normalizedSubject = input.subject.trim();
  const normalizedBodyHtml = sanitizeMessageHtml(input.bodyHtml);
  const normalizedBodyText = input.bodyText?.trim() || stripHtml(normalizedBodyHtml);
  const normalizedPreviewText = normalizePreviewText(
    input.previewText,
    normalizedBodyText,
    normalizedBodyHtml,
  );
  const safeRecipientName = escapeHtml(input.recipientName);
  const safeSenderName = escapeHtml(env.mailFromName);
  const eventDateLabel = formatEventDate(input.eventDate);
  const eventTitle = input.eventTitle?.trim() || null;
  const messageBody = `<div style="font-size:15px;line-height:1.85;color:#334155;">
    <p style="margin:0 0 18px;">Halo ${safeRecipientName},</p>
    ${normalizedBodyHtml}
  </div>`;

  let html = "";

  if (template.id === "event_spotlight") {
    html = buildEmailShell({
      accent: template.accent,
      eyebrow: "Campaign Broadcast",
      heading: normalizedSubject,
      previewText: normalizedPreviewText,
      eventTitle,
      eventDateLabel,
      bodyHtml: messageBody,
      footerNote: `Pesan ini dikirim oleh ${safeSenderName}. Jika Anda menerima email ini karena terdaftar pada event terkait, simpan email ini sebagai referensi terbaru.`,
      cardStyle:
        "background:#fffaf0;border:1px solid #fdba74;border-radius:28px;overflow:hidden;",
      headerStyle:
        "padding:32px 32px 18px;background:linear-gradient(180deg,#fff7ed 0%,#ffffff 100%);",
      bodyStyle: "padding:26px 32px 28px;",
    });
  } else if (template.id === "minimal_notice") {
    html = buildEmailShell({
      accent: template.accent,
      eyebrow: "Notification",
      heading: normalizedSubject,
      previewText: normalizedPreviewText,
      eventTitle,
      eventDateLabel,
      bodyHtml: messageBody,
      footerNote: `Pesan ini dikirim otomatis melalui ${safeSenderName}.`,
      cardStyle:
        "background:#ffffff;border:1px solid #cbd5e1;border-radius:18px;overflow:hidden;",
      headerStyle: "padding:28px 32px 18px;background:#ffffff;",
      bodyStyle: "padding:20px 32px 26px;",
    });
  } else {
    html = buildEmailShell({
      accent: template.accent,
      eyebrow: "Yorindo EMS",
      heading: normalizedSubject,
      previewText: normalizedPreviewText,
      eventTitle,
      eventDateLabel,
      bodyHtml: messageBody,
      footerNote: `Pesan ini dikirim oleh ${safeSenderName}. Pastikan Anda menyimpan informasi ini untuk pembaruan event berikutnya.`,
      cardStyle:
        "background:#ffffff;border:1px dashed #94a3b8;border-radius:24px;overflow:hidden;",
      headerStyle:
        "padding:32px 32px 18px;background:linear-gradient(180deg,#eef4ff 0%,#ffffff 100%);",
      bodyStyle: "padding:24px 32px 28px;",
    });
  }

  const text = [
    `Halo ${input.recipientName},`,
    normalizedBodyText,
    eventTitle ? `Event: ${eventTitle}` : "",
    eventDateLabel ? `Tanggal event: ${eventDateLabel}` : "",
    `Dikirim oleh ${env.mailFromName}.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    template,
    subject: normalizedSubject,
    previewText: normalizedPreviewText,
    html,
    text,
  };
}
