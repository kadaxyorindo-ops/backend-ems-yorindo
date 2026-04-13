import { env } from "../config/env.ts";
import { YORINDO_LOGO_CID } from "./email.service.ts";

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
  eventLocation?: string | null;
  eventIndustry?: string | null;
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
    description:
      "More expressive card layout for campaign-style announcements.",
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

  const fallback = (bodyText?.trim() || stripHtml(bodyHtml))
    .slice(0, 140)
    .trim();
  return fallback || "Update from Yorindo EMS.";
}

function formatEventDate(value?: Date | string | null) {
  if (!value) {
    return null;
  }

  const dateValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
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
  eventLocation: string | null;
  eventIndustry: string | null;
  bodyHtml: string;
  footerNote: string;
  cardStyle: string;
  headerStyle: string;
  bodyStyle: string;
}) {
  const safeEyebrow = escapeHtml(params.eyebrow);
  const safeHeading = escapeHtml(params.heading);
  const safePreviewText = escapeHtml(params.previewText);
  const safeEventTitle = params.eventTitle
    ? escapeHtml(params.eventTitle)
    : null;
  const safeEventDate = params.eventDateLabel
    ? escapeHtml(params.eventDateLabel)
    : null;
  const safeEventLocation = params.eventLocation
    ? escapeHtml(params.eventLocation)
    : null;
  const safeEventIndustry = params.eventIndustry
    ? escapeHtml(params.eventIndustry)
    : null;
  const safeFooter = escapeHtml(params.footerNote);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${safeHeading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${safePreviewText}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;margin:48px 16px 40px;">
            <tr>
              <td align="center" style="padding:28px 40px;background-color:#0c1b45;">
                <div style="display:inline-block;background-color:#ffffff;border-radius:14px;padding:14px 28px;">
                  <img src="cid:${YORINDO_LOGO_CID}" alt="Yorindo Communication" width="140" style="display:block;width:140px;max-width:140px;height:auto;border:0;" />
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px 0;">
                <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;line-height:1;">
                  ${safeEyebrow}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 8px;">
                <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;font-weight:700;color:#0f172a;">
                  ${safeHeading}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px;font-size:15px;line-height:1.8;color:#475569;">
                ${params.bodyHtml}
              </td>
            </tr>
            ${
              safeEventTitle || safeEventDate || safeEventLocation || safeEventIndustry
                ? `<tr>
              <td style="padding:20px 40px 0;">
                <div style="border:1px solid #e2e8f0;border-radius:12px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);padding:20px 22px;overflow:hidden;">
                  ${
                    safeEventTitle
                      ? `<p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#0f172a;line-height:1.3;">${safeEventTitle}</p>`
                      : ""
                  }
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;">
                    ${
                      safeEventDate
                        ? `<tr>
                      <td style="padding:4px 0;vertical-align:top;width:20px;">
                        <span style="font-size:13px;">&#128197;</span>
                      </td>
                      <td style="padding:4px 0 4px 8px;font-size:13px;line-height:1.5;color:#475569;">${safeEventDate}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      safeEventLocation
                        ? `<tr>
                      <td style="padding:4px 0;vertical-align:top;width:20px;">
                        <span style="font-size:13px;">&#128205;</span>
                      </td>
                      <td style="padding:4px 0 4px 8px;font-size:13px;line-height:1.5;color:#475569;">${safeEventLocation}</td>
                    </tr>`
                        : ""
                    }
                    ${
                      safeEventIndustry
                        ? `<tr>
                      <td style="padding:4px 0;vertical-align:top;width:20px;">
                        <span style="font-size:13px;">&#127981;</span>
                      </td>
                      <td style="padding:4px 0 4px 8px;font-size:13px;line-height:1.5;color:#475569;">${safeEventIndustry}</td>
                    </tr>`
                        : ""
                    }
                  </table>
                </div>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:0 40px 28px;">
                <p style="margin:0;font-size:13px;line-height:1.7;color:#94a3b8;">
                  ${safeFooter}
                </p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #f1f5f9;padding:18px 40px;background-color:#f8fafc;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td>
                      <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">Sent to the email address registered with Yorindo EMS.</p>
                    </td>
                    <td align="right" style="white-space:nowrap;">
                      <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#cbd5e1;">Yorindo EMS</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0;font-size:0;line-height:0;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="height:5px;background-color:#6B3FA0;font-size:1px;line-height:1px;">&nbsp;</td>
                    <td style="height:5px;background-color:#2B5EAB;font-size:1px;line-height:1px;">&nbsp;</td>
                    <td style="height:5px;background-color:#43B049;font-size:1px;line-height:1px;">&nbsp;</td>
                    <td style="height:5px;background-color:#EA4C1B;font-size:1px;line-height:1px;">&nbsp;</td>
                    <td style="height:5px;background-color:#F5A623;font-size:1px;line-height:1px;">&nbsp;</td>
                  </tr>
                </table>
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

function replacePlaceholders(
  content: string,
  variables: Record<string, string>,
): string {
  return content.replace(
    /\{\{(\w+)\}\}/g,
    (match, key: string) => variables[key] ?? match,
  );
}

export function renderCommunicationEmail(
  input: RenderCommunicationEmailInput,
): RenderCommunicationEmailResult {
  const template = getCommunicationEmailTemplate(input.templateId);
  const eventDateLabel = formatEventDate(input.eventDate);
  const eventTitle = input.eventTitle?.trim() || null;
  const eventLocation = input.eventLocation?.trim() || null;
  const eventIndustry = input.eventIndustry?.trim() || null;

  const placeholderVars: Record<string, string> = {
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    eventTitle: eventTitle ?? "",
    eventDate: eventDateLabel ?? "",
    eventLocation: eventLocation ?? "",
    eventIndustry: eventIndustry ?? "",
  };

  const normalizedSubject = replacePlaceholders(
    input.subject.trim(),
    placeholderVars,
  );
  const normalizedBodyHtml = sanitizeMessageHtml(
    replacePlaceholders(input.bodyHtml, placeholderVars),
  );
  const normalizedBodyText =
    replacePlaceholders(input.bodyText?.trim() || "", placeholderVars) ||
    stripHtml(normalizedBodyHtml);
  const normalizedPreviewText = replacePlaceholders(
    normalizePreviewText(
      input.previewText,
      normalizedBodyText,
      normalizedBodyHtml,
    ),
    placeholderVars,
  );
  const safeSenderName = escapeHtml(env.mailFromName);
  const messageBody = `<div style="font-size:15px;line-height:1.85;color:#334155;">
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
      eventLocation,
      eventIndustry,
      bodyHtml: messageBody,
      footerNote: `Email notifications are sent when there are updates to your registered events.`,
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
      eventLocation,
      eventIndustry,
      bodyHtml: messageBody,
      footerNote: `This message was sent automatically from ${safeSenderName}.`,
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
      eventLocation,
      eventIndustry,
      bodyHtml: messageBody,
      footerNote: `Keep this message for future reference regarding your registered event.`,
      cardStyle:
        "background:#ffffff;border:1px dashed #94a3b8;border-radius:24px;overflow:hidden;",
      headerStyle:
        "padding:32px 32px 18px;background:linear-gradient(180deg,#eef4ff 0%,#ffffff 100%);",
      bodyStyle: "padding:24px 32px 28px;",
    });
  }

  const text = [
    normalizedBodyText,
    eventTitle ? `Event: ${eventTitle}` : "",
    eventDateLabel ? `Date: ${eventDateLabel}` : "",
    eventLocation ? `Location: ${eventLocation}` : "",
    eventIndustry ? `Industry: ${eventIndustry}` : "",
    `Sent by ${env.mailFromName}.`,
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
