import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { Types } from "mongoose";
import { Event, Participant, Registration } from "../models/index.ts";
import {
  escapeEmailHtml,
  sendEmailMessage,
  YORINDO_LOGO_B64,
} from "./email.service.ts";
import { signRegistrationTicket } from "../utils/jwt.ts";
import { enqueueRegistrationTicketJob } from "./email-queue.service.ts";

export type RegistrationTicketQueueResult = {
  queueAccepted: boolean;
  status: "queued" | "failed";
  message: string;
  error: string | null;
};

const QR_ATTACHMENT_CID = "yorindo-registration-ticket-qr";

function toObjectId(value: string) {
  return Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : null;
}

function resolveTicketRecipient(participant: {
  fullName?: string | null;
  personalEmail?: string | null;
  companyEmail?: string | null;
} | null) {
  if (!participant) {
    return null;
  }

  const email =
    participant.personalEmail?.trim() || participant.companyEmail?.trim() || "";

  if (!email) {
    return null;
  }

  return {
    fullName: participant.fullName?.trim() || "Participant",
    email,
  };
}

function formatEventDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Event schedule to be confirmed";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildAttachmentFileName(eventTitle: string | null) {
  const safeSlug = (eventTitle || "yorindo-event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${safeSlug || "yorindo-event"}-qr-ticket.png`;
}

function buildQueuedTicketDelivery(queuedAt: Date) {
  return {
    status: "queued" as const,
    queuedAt,
    lastAttemptAt: null,
    sentAt: null,
    failedAt: null,
    failureReason: null,
    attempts: 0,
  };
}

async function markTicketDeliveryFailed(
  registrationId: Types.ObjectId,
  reason: string,
) {
  await Registration.findByIdAndUpdate(registrationId, {
    $set: {
      "ticketDelivery.status": "failed",
      "ticketDelivery.sentAt": null,
      "ticketDelivery.failedAt": new Date(),
      "ticketDelivery.failureReason": reason,
    },
  });
}

function renderTicketEmail(params: {
  recipientName: string;
  eventTitle: string | null;
  eventDate: Date | string | null | undefined;
  eventLocation: string | null | undefined;
  ticketCode: string;
}) {
  const safeRecipientName = escapeEmailHtml(params.recipientName);
  const eventTitle = params.eventTitle?.trim() || "Yorindo Event";
  const safeEventTitle = escapeEmailHtml(eventTitle);
  const safeEventLocation = escapeEmailHtml(
    params.eventLocation?.trim() || "Venue details will be shared soon",
  );
  const safeTicketCode = escapeEmailHtml(params.ticketCode);
  const formattedEventDate = escapeEmailHtml(formatEventDate(params.eventDate));
  const subject = `Your QR Ticket — ${eventTitle}`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${safeEventTitle} Ticket</title>
</head>
<body style="margin:0;padding:0;background-color:#eef3ff;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#eef3ff;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dbe5ff;box-shadow:0 16px 48px rgba(15,47,120,0.08);">
          <tr>
            <td style="padding:0;font-size:0;line-height:0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="height:6px;background-color:#6B3FA0;font-size:1px;line-height:1px;">&nbsp;</td>
                  <td style="height:6px;background-color:#2B5EAB;font-size:1px;line-height:1px;">&nbsp;</td>
                  <td style="height:6px;background-color:#43B049;font-size:1px;line-height:1px;">&nbsp;</td>
                  <td style="height:6px;background-color:#EA4C1B;font-size:1px;line-height:1px;">&nbsp;</td>
                  <td style="height:6px;background-color:#F5A623;font-size:1px;line-height:1px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:28px 32px 20px;border-bottom:1px solid #edf2ff;">
              <img src="data:image/png;base64,${YORINDO_LOGO_B64}" alt="Yorindo EMS" width="184" height="61" style="display:block;width:184px;max-width:184px;height:auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 12px;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;line-height:1;">Approved Registration</p>
              <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;color:#0f2f78;font-weight:700;">Your QR Ticket Is Ready</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#475569;">Hi <strong style="color:#0f172a;">${safeRecipientName}</strong>, your registration for <strong style="color:#0f172a;">${safeEventTitle}</strong> has been approved. Please keep this QR ticket and show it at the check-in desk.</p>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;border-collapse:separate;border-spacing:0;">
                <tr>
                  <td style="background-color:#f8fbff;border:1px solid #dbe5ff;border-radius:20px;padding:20px 22px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom:12px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Event</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:8px;font-size:22px;line-height:1.3;font-weight:700;color:#102a63;">${safeEventTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:6px;font-size:14px;line-height:1.7;color:#475569;">${formattedEventDate}</td>
                      </tr>
                      <tr>
                        <td style="font-size:14px;line-height:1.7;color:#475569;">${safeEventLocation}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center" style="padding:0 0 18px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #dbe5ff;border-radius:24px;padding:12px;">
                      <tr>
                        <td align="center">
                          <img src="cid:${QR_ATTACHMENT_CID}" alt="QR ticket for event check-in" width="240" height="240" style="display:block;width:240px;height:240px;border:0;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">Ticket Code</p>
                    <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:700;line-height:1.7;color:#0f172a;word-break:break-word;">${safeTicketCode}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
                <tr>
                  <td style="background-color:#fef8e7;border-left:4px solid #f5a623;border-radius:6px;padding:14px 16px;">
                    <p style="margin:0;font-size:13px;line-height:1.7;color:#6b5a13;">Save this email or download the QR image attachment before arriving at the venue. Each ticket is unique and can only be used once for check-in.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:13px;line-height:1.7;color:#94a3b8;">If you believe this approval email reached you by mistake, please reply to this message so the event team can investigate.</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #edf2ff;padding:18px 32px;background-color:#f8fbff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">This ticket was sent to the email registered in Yorindo EMS.</p>
                  </td>
                  <td align="right" style="white-space:nowrap;">
                    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#cbd5e1;">Yorindo EMS</p>
                  </td>
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

  const text = [
    `Hi ${params.recipientName},`,
    `Your registration for ${eventTitle} has been approved.`,
    `Event schedule: ${formatEventDate(params.eventDate)}`,
    `Location: ${params.eventLocation?.trim() || "Venue details will be shared soon"}`,
    `Ticket code: ${params.ticketCode}`,
    "Your QR ticket is attached to this email. Please keep it and show it during event check-in.",
  ].join("\n");

  return {
    subject,
    html,
    text,
    attachmentFileName: buildAttachmentFileName(eventTitle),
  };
}

async function buildTicketQrBuffer(value: string) {
  return QRCode.toBuffer(value, {
    errorCorrectionLevel: "M",
    margin: 1,
    type: "png",
    width: 320,
    color: {
      dark: "#0f2f78",
      light: "#ffffff",
    },
  });
}

export function buildRegistrationTicket(params: {
  registrationId: string;
  eventId: string;
}) {
  const qrCode = randomUUID();

  return {
    qrCode,
    qrPayload: signRegistrationTicket({
      registrationId: params.registrationId,
      eventId: params.eventId,
      qrCode,
    }),
    issuedAt: new Date(),
    reissueCount: 0,
    isActive: true,
  };
}

export async function queueRegistrationTicketEmail(
  registrationId: string,
): Promise<RegistrationTicketQueueResult> {
  const objectId = toObjectId(registrationId);

  if (!objectId) {
    return {
      queueAccepted: false,
      status: "failed",
      message: "Registration approved, but QR ticket queue payload is invalid.",
      error: "Registration ID tidak valid.",
    };
  }

  const registration = await Registration.findById(objectId)
    .select("participantId status ticket")
    .lean();

  if (!registration || registration.status !== "approved" || !registration.ticket?.qrCode) {
    return {
      queueAccepted: false,
      status: "failed",
      message: "Registration approved, but QR ticket data is incomplete.",
      error: "Registration belum memiliki ticket aktif.",
    };
  }

  const participant = await Participant.findById(registration.participantId)
    .select("fullName personalEmail companyEmail")
    .lean();
  const recipient = resolveTicketRecipient(participant);

  if (!recipient) {
    const reason =
      "Participant belum memiliki email personal atau company yang valid untuk pengiriman QR ticket.";
    await markTicketDeliveryFailed(objectId, reason);
    return {
      queueAccepted: false,
      status: "failed",
      message:
        "Registration approved, but the participant does not have a deliverable email for the QR ticket.",
      error: reason,
    };
  }

  const queuedAt = new Date();

  await Registration.findByIdAndUpdate(objectId, {
    $set: {
      ticketDelivery: buildQueuedTicketDelivery(queuedAt),
    },
  });

  try {
    await enqueueRegistrationTicketJob({ registrationId });
    return {
      queueAccepted: true,
      status: "queued",
      message:
        "Registration approved. QR ticket generated and queued for email delivery.",
      error: null,
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown RabbitMQ queue error.";

    await markTicketDeliveryFailed(objectId, reason);

    return {
      queueAccepted: false,
      status: "failed",
      message: `Registration approved, but QR ticket email failed to enter the queue. ${reason}`,
      error: reason,
    };
  }
}

export async function queueApprovedRegistrationTicketEmails(
  registrationIds: string[],
) {
  const uniqueRegistrationIds = Array.from(
    new Set(registrationIds.filter((value) => value.trim())),
  );

  const results = await Promise.all(
    uniqueRegistrationIds.map(async (registrationId) => ({
      registrationId,
      ...(await queueRegistrationTicketEmail(registrationId)),
    })),
  );

  const queueFailures = results
    .filter((result) => !result.queueAccepted)
    .map((result) => ({
      registrationId: result.registrationId,
      reason: result.error ?? "Unknown queue error.",
    }));

  return {
    queuedCount: results.filter((result) => result.queueAccepted).length,
    failedQueueCount: queueFailures.length,
    queueFailures,
  };
}

export async function processQueuedRegistrationTicketEmail(
  registrationId: string,
) {
  const objectId = toObjectId(registrationId);

  if (!objectId) {
    console.warn(`[QUEUE] Skip invalid registration ticket id: ${registrationId}`);
    return;
  }

  const now = new Date();
  const registration = await Registration.findOneAndUpdate(
    {
      _id: objectId,
      status: { $in: ["approved", "checked_in"] },
      "ticket.isActive": true,
      "ticket.qrCode": { $exists: true },
      "ticketDelivery.status": "queued",
    },
    {
      $set: {
        "ticketDelivery.status": "processing",
        "ticketDelivery.lastAttemptAt": now,
        "ticketDelivery.failedAt": null,
        "ticketDelivery.failureReason": null,
      },
      $inc: {
        "ticketDelivery.attempts": 1,
      },
    },
    {
      returnDocument: "after",
    },
  ).lean();

  if (!registration || !registration.ticket?.qrCode) {
    return;
  }

  const [participant, event] = await Promise.all([
    Participant.findById(registration.participantId)
      .select("fullName personalEmail companyEmail")
      .lean(),
    Event.findById(registration.eventId)
      .select("title eventDate location")
      .lean(),
  ]);

  const recipient = resolveTicketRecipient(participant);

  if (!recipient) {
    await markTicketDeliveryFailed(
      objectId,
      "Participant belum memiliki email tujuan untuk pengiriman QR ticket.",
    );
    return;
  }

  try {
    const qrValue = registration.ticket.qrPayload?.trim() || registration.ticket.qrCode;
    const qrBuffer = await buildTicketQrBuffer(qrValue);
    const email = renderTicketEmail({
      recipientName: recipient.fullName,
      eventTitle: event?.title ?? null,
      eventDate: event?.eventDate,
      eventLocation: event?.location,
      ticketCode: registration.ticket.qrCode,
    });

    await sendEmailMessage({
      to: recipient.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: [
        {
          filename: email.attachmentFileName,
          content: qrBuffer,
          contentType: "image/png",
          cid: QR_ATTACHMENT_CID,
        },
      ],
    });

    await Registration.findByIdAndUpdate(objectId, {
      $set: {
        "ticketDelivery.status": "sent",
        "ticketDelivery.sentAt": new Date(),
        "ticketDelivery.failedAt": null,
        "ticketDelivery.failureReason": null,
      },
    });
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : "Unknown QR ticket delivery error.";

    await markTicketDeliveryFailed(objectId, reason);
  }
}
