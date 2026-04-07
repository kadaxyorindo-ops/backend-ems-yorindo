/**
 * @file seed.ts
 * @description Database reset and seed script for development.
 *
 * Clears all collections (without dropping indexes) and reseeds with fresh data:
 *  - 11 super_admin users
 *  - Master data: industries, cities, job titles, companies
 *  - 15 events with realistic English data
 *  - 5–15 registrations per event (randomized statuses)
 *  - Event 0 includes participants from the super_admin email list
 *
 * Usage:
 *   npx tsx src/scripts/seed.ts
 *
 * WARNING: Deletes all existing data. Do NOT run against production.
 */

import "dotenv/config";
import mongoose, { Types } from "mongoose";
import { connectDB } from "../config/db.js";
import { Industry } from "../models/schemas/industry.schema.js";
import { City } from "../models/schemas/city.schema.js";
import { JobTitle } from "../models/schemas/job-title.schema.js";
import { Company } from "../models/schemas/company.schema.js";
import { User } from "../models/schemas/user.schema.js";
import { Otp } from "../models/schemas/otp.schema.js";
import { Event } from "../models/schemas/event.schema.js";
import { Participant } from "../models/schemas/participant.schema.js";
import { Registration } from "../models/schemas/registration.schema.js";
import { Survey } from "../models/schemas/survey.schema.js";
import { SurveyResponse } from "../models/schemas/survey-response.schema.js";
import { AuditLog } from "../models/schemas/audit-log.schema.js";
import { CommunicationCampaign } from "../models/schemas/communication-campaign.schema.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return crypto.randomUUID();
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${base}-${suffix}`;
}

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Super Admin Definitions
// ---------------------------------------------------------------------------

const SUPER_ADMINS = [
  { email: "daffakpc21@gmail.com",      name: "Daffa Kusuma" },
  { email: "annalyce75@gmail.com",      name: "Anna Lyce" },
  { email: "anadaasb@gmail.com",        name: "Ana Davis" },
  { email: "ilma.nabila63@gmail.com",   name: "Ilma Nabila" },
  { email: "dzakiarief42@gmail.com",    name: "Dzaki Arief" },
  { email: "roufaufal01@gmail.com",     name: "Roufa Ufal" },
  { email: "hgabigael87@gmail.com",     name: "Gabriel Huang" },
  { email: "nalaajei@gmail.com",        name: "Nala Ajei" },
  { email: "akhyafajar871@gmail.com",   name: "Akhya Fajar" },
  { email: "cececaroline2005@gmail.com",name: "Cece Caroline" },
  { email: "zeiniahalfiah@gmail.com",   name: "Zeinia Halfiah" },
] as const;

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seedAdditionalParticipants(): Promise<void> {
  console.log("\n[SEED] Append-only mode: adding participants...\n");

  const eventDoc = await Event.findById(TARGET_EVENT_ID).lean();
  if (!eventDoc) {
    throw new Error(`Event not found for ID ${TARGET_EVENT_ID.toHexString()}`);
  }

  const [companyDocs, industries, jobTitles, cities, users] = await Promise.all(
    [
      Company.find().lean(),
      Industry.find().lean(),
      JobTitle.find().lean(),
      City.find().lean(),
      User.find().lean(),
    ],
  );

  if (!companyDocs.length) throw new Error("Companies not found");
  if (!industries.length) throw new Error("Industries not found");
  if (!jobTitles.length) throw new Error("Job titles not found");
  if (!cities.length) throw new Error("Cities not found");

  const adminUser = users[0] ?? null;

  const snapshotFields = (eventDoc.registrationForm?.fields ?? []) as Array<{
    fieldId: string;
    key: string;
    label: string;
    type:
      | "text"
      | "email"
      | "phone"
      | "number"
      | "textarea"
      | "radio"
      | "checkbox"
      | "select"
      | "date"
      | "file";
    order: number;
    isFixed: boolean;
    options?: Array<{ value: string; label?: string }>;
  }>;

  if (!snapshotFields.length) {
    throw new Error("Event registration form fields not found");
  }

  const fieldByKey = new Map(snapshotFields.map((field) => [field.key, field]));
  const getField = (key: string) => {
    const field = fieldByKey.get(key);
    if (!field) {
      throw new Error(`Missing form field for key: ${key}`);
    }
    return field;
  };

  interface SnapRef {
    _id: Types.ObjectId;
    name: string;
  }
  interface PRaw {
    fullName: string;
    coIdx: number;
    ind: SnapRef;
    jt: SnapRef;
    city: SnapRef;
    dept: string;
    jabatan: string;
    jenisLayanan: string;
    companyEmail: string | null;
    phone: string | null;
    type: "participant" | "exhibitor";
    status: "pending" | "approved" | "rejected" | "checked_in";
  }

  const deptOptions = ["HR", "IT", "Finance", "Operations"];
  const statusOptions: PRaw["status"][] = ["pending", "approved", "checked_in"];
  const industryOptions = industries as unknown as SnapRef[];
  const jobTitleOptions = jobTitles as unknown as SnapRef[];
  const cityOptions = cities as unknown as SnapRef[];

  const pRaw: PRaw[] = [];
  const generatedCount = 100;

  for (let i = 0; i < generatedCount; i += 1) {
    const index = i + 1;
    const coIdx = i % companyDocs.length;
    const ind = industryOptions[i % industryOptions.length]!;
    const jt = jobTitleOptions[i % jobTitleOptions.length]!;
    const city = cityOptions[i % cityOptions.length]!;
    const dept = deptOptions[i % deptOptions.length]!;
    const status = statusOptions[i % statusOptions.length]!;

    pRaw.push({
      fullName: `Seed Participant ${index}`,
      coIdx,
      ind,
      jt,
      city,
      dept,
      jabatan: jt.name,
      jenisLayanan: ind.name,
      companyEmail: `seed${String(index).padStart(3, "0")}@example.com`,
      phone: `0812000${String(index).padStart(4, "0")}`,
      type: "participant",
      status,
    });
  }

  const participantDocs = await Participant.insertMany(
    pRaw.map((p) => ({
      fullName: p.fullName,
      normalizedFullName: p.fullName.toLowerCase(),
      personalEmail: `personal.${p.companyEmail}`,
      companyEmail: p.companyEmail,
      phone: p.phone,
      company: {
        companyId: companyDocs[p.coIdx]!._id,
        name: companyDocs[p.coIdx]!.name,
      },
      industry: {
        refId: p.ind._id,
        name: p.ind.name,
      },
      jobTitle: {
        refId: p.jt._id,
        name: p.jt.name,
      },
      city: {
        refId: p.city._id,
        name: p.city.name,
      },
      defaultParticipantType: p.type,
      sourceChannel: { code: "Seed", otherText: null },
      identityFingerprint: null,
      notes: null,
      isActive: true,
    })),
  );

  const radioChoices = ["Basic", "Pro", "Enterprise"];
  const checkboxChoices = ["CRM", "ERP", "HRIS", "Analytics"];
  const selectChoices = ["instagram", "linkedin", "website"];

  const registrations = participantDocs.map((participant, i) => {
    const raw = pRaw[i]!;
    const isApproved = raw.status === "approved" || raw.status === "checked_in";
    const isCheckedIn = raw.status === "checked_in";
    const isRejected = raw.status === "rejected";

    const approvedAt = isApproved ? new Date() : null;
    const qrCode = isApproved ? `QR-${uid()}` : null;

    const answers = [
      {
        ...getField("full_name"),
        value: raw.fullName,
      },
      {
        ...getField("company_name"),
        value: companyDocs[raw.coIdx]!.name,
      },
      {
        ...getField("company_location"),
        value: raw.city.name,
      },
      {
        ...getField("industry"),
        value: raw.ind.name,
      },
      {
        ...getField("job_title"),
        value: raw.jabatan,
      },
      {
        ...getField("company_email"),
        value: raw.companyEmail ?? "",
      },
      {
        ...getField("personal_email"),
        value: `personal.${raw.companyEmail}`,
      },
      {
        ...getField("phone"),
        value: raw.phone ?? "",
      },
      {
        ...getField("short_text_q"),
        value: `Jawaban singkat ${i + 1}`,
      },
      {
        ...getField("email_q"),
        value: `alt${String(i + 1).padStart(3, "0")}@example.com`,
      },
      {
        ...getField("phone_q"),
        value: `0812555${String(i + 1).padStart(4, "0")}`,
      },
      {
        ...getField("number_q"),
        value: 50 + (i % 450),
      },
      {
        ...getField("textarea_q"),
        value: `Perusahaan kami bergerak di bidang ${raw.jenisLayanan}.`,
      },
      {
        ...getField("radio_q"),
        value: pick(radioChoices, i),
      },
      {
        ...getField("checkbox_q"),
        value: pickMany(checkboxChoices, i),
      },
      {
        ...getField("select_q"),
        value: pick(selectChoices, i),
      },
      {
        ...getField("date_q"),
        value: new Date(2025, 9, (i % 28) + 1),
      },
    ];

    return {
      eventId: eventDoc._id,
      participantId: participant._id,
      participantType: raw.type,
      status: raw.status,
      approval: {
        approvedBy: isApproved ? (adminUser?._id ?? null) : null,
        approvedAt,
        rejectedBy: isRejected ? (adminUser?._id ?? null) : null,
        rejectedAt: isRejected ? new Date() : null,
        rejectionReason: isRejected ? "Seed rejected" : null,
      },
      formSnapshot: {
        version: eventDoc.registrationForm?.version ?? 1,
        fields: snapshotFields,
      },
      answers,
      companySnapshot: {
        companyId: companyDocs[raw.coIdx]!._id,
        name: companyDocs[raw.coIdx]!.name,
      },
      industrySnapshot: {
        refId: raw.ind._id,
        name: raw.ind.name,
      },
      jobTitleSnapshot: {
        refId: raw.jt._id,
        name: raw.jt.name,
      },
      citySnapshot: {
        refId: raw.city._id,
        name: raw.city.name,
      },
      ticket: qrCode
        ? {
            qrCode,
            issuedAt: approvedAt,
            reissueCount: 0,
            isActive: true,
          }
        : null,
      checkIn: {
        isAttended: isCheckedIn,
        checkedInAt: isCheckedIn ? eventDoc.eventDate : null,
        checkedInBy: isCheckedIn ? (adminUser?._id ?? null) : null,
        scanMethod: "qr",
        notes: null,
      },
    };
  });

  const customFieldIds = new Set(Object.values(CUSTOM_FIELD_IDS));
  const surveyTypeMap: Record<string, string> = {
    text: "text",
    email: "text",
    phone: "text",
    number: "number",
    textarea: "textarea",
    radio: "radio",
    checkbox: "checkbox",
    select: "select",
    date: "date",
  };

  const surveyResponses = registrations
    .map((registration) => {
      const answers = registration.answers
        .filter((answer) => customFieldIds.has(answer.fieldId))
        .map((answer) => {
          const mappedType = surveyTypeMap[answer.type];
          if (!mappedType) return null;
          return {
            questionId: answer.fieldId,
            label: answer.label,
            type: mappedType,
            value: answer.value,
          };
        })
        .filter(Boolean) as Array<{
        questionId: string;
        label: string;
        type: string;
        value: unknown;
      }>;

      return {
        eventId: eventDoc._id,
        surveyId: eventDoc.surveyId ?? null,
        participantId: registration.participantId,
        answers,
        submittedAt: new Date(),
      };
    })
    .filter((response) => response.answers.length > 0);

  await Registration.insertMany(registrations);
  if (surveyResponses.length > 0) {
    await SurveyResponse.insertMany(surveyResponses);
  }
  console.log(`[SEED] Added participants: ${participantDocs.length}`);
  console.log(`[SEED] Added registrations: ${registrations.length}`);
  console.log(`[SEED] Added survey responses: ${surveyResponses.length}`);
}

async function seed(): Promise<void> {
  await connectDB();
  console.log("\n[SEED] Starting...\n");

  // -------------------------------------------------------------------------
  // 1. Clear all collections (deleteMany — preserves indexes)
  // -------------------------------------------------------------------------
  await Promise.all([
    Industry.deleteMany({}),
    City.deleteMany({}),
    JobTitle.deleteMany({}),
    Company.deleteMany({}),
    User.deleteMany({}),
    Otp.deleteMany({}),
    Event.deleteMany({}),
    Participant.deleteMany({}),
    Registration.deleteMany({}),
    Survey.deleteMany({}),
    SurveyResponse.deleteMany({}),
    AuditLog.deleteMany({}),
    CommunicationCampaign.deleteMany({}),
  ]);
  console.log("[SEED] Database cleared.\n");

  // -------------------------------------------------------------------------
  // 2. Industries
  // -------------------------------------------------------------------------
  const [
    iManufacturing, iTextile, iAutomotive, iGarment,
    iIT, iElectronics, iFootwear, iEnergy, iAgribusiness,
  ] = await Industry.insertMany([
    { name: "Manufacturing",          normalizedName: "manufacturing" },
    { name: "Textile",                normalizedName: "textile" },
    { name: "Automotive",             normalizedName: "automotive" },
    { name: "Garment Industry",       normalizedName: "garment industry" },
    { name: "Information Technology", normalizedName: "information technology" },
    { name: "Electronic Components",  normalizedName: "electronic components" },
    { name: "Footwear",               normalizedName: "footwear" },
    { name: "Energy & Battery",       normalizedName: "energy & battery" },
    { name: "Agribusiness",           normalizedName: "agribusiness" },
  ]);
  console.log("[SEED] Industries: 9");

  // -------------------------------------------------------------------------
  // 3. Cities
  // -------------------------------------------------------------------------
  const [
    cJakarta, cBandung, cSurabaya, cBali, cYogyakarta,
    cMedan, cKarawang, cPurwakarta, cBekasi,
  ] = await City.insertMany([
    { name: "Jakarta",    normalizedName: "jakarta",    province: "DKI Jakarta",     country: "Indonesia" },
    { name: "Bandung",    normalizedName: "bandung",    province: "West Java",       country: "Indonesia" },
    { name: "Surabaya",   normalizedName: "surabaya",   province: "East Java",       country: "Indonesia" },
    { name: "Bali",       normalizedName: "bali",       province: "Bali",            country: "Indonesia" },
    { name: "Yogyakarta", normalizedName: "yogyakarta", province: "D.I. Yogyakarta", country: "Indonesia" },
    { name: "Medan",      normalizedName: "medan",      province: "North Sumatra",   country: "Indonesia" },
    { name: "Karawang",   normalizedName: "karawang",   province: "West Java",       country: "Indonesia" },
    { name: "Purwakarta", normalizedName: "purwakarta", province: "West Java",       country: "Indonesia" },
    { name: "Bekasi",     normalizedName: "bekasi",     province: "West Java",       country: "Indonesia" },
  ]);
  console.log("[SEED] Cities: 9");

  // -------------------------------------------------------------------------
  // 4. Job Titles
  // -------------------------------------------------------------------------
  const [
    jtHRManager, jtHRBPManager, jtHRGAManager, jtHRStaff,
    jtManager, jtSupervisor, jtITManager, jtITStaff,
    jtDirector, jtAssistantManager, jtDivisionHead, jtAnalyst,
  ] = await JobTitle.insertMany([
    { name: "HR Manager",        normalizedName: "hr manager" },
    { name: "HRBP Manager",      normalizedName: "hrbp manager" },
    { name: "HRGA Manager",      normalizedName: "hrga manager" },
    { name: "HR Staff",          normalizedName: "hr staff" },
    { name: "Manager",           normalizedName: "manager" },
    { name: "Supervisor",        normalizedName: "supervisor" },
    { name: "IT Manager",        normalizedName: "it manager" },
    { name: "IT Staff",          normalizedName: "it staff" },
    { name: "Director",          normalizedName: "director" },
    { name: "Assistant Manager", normalizedName: "assistant manager" },
    { name: "Division Head",     normalizedName: "division head" },
    { name: "Business Analyst",  normalizedName: "business analyst" },
  ]);
  console.log("[SEED] Job Titles: 12");

  // -------------------------------------------------------------------------
  // 5. Companies
  // -------------------------------------------------------------------------
  const companiesRaw = [
    { name: "PT Seyang Activewear",                          ind: iGarment! },
    { name: "PT Adient Automotive Indonesia",                ind: iAutomotive! },
    { name: "PT Sanwa Musen Indonesia",                      ind: iElectronics! },
    { name: "PT PK Manufacturing Indonesia",                 ind: iManufacturing! },
    { name: "PT Japfa Comfeed Indonesia",                    ind: iAgribusiness! },
    { name: "PT Indo-Rama Synthetics",                       ind: iTextile! },
    { name: "PT Indonesia Simon",                            ind: iFootwear! },
    { name: "PT Hitachi Construction Machinery Indonesia",   ind: iManufacturing! },
    { name: "PT Furukawa Indomobil Battery Manufacturing",   ind: iEnergy! },
    { name: "PT Yamaha Motor Parts Manufacturing Indonesia", ind: iAutomotive! },
    { name: "PT Astra Honda Motor",                          ind: iAutomotive! },
    { name: "PT Len Industri",                               ind: iElectronics! },
    { name: "PT Malindo Feedmill",                           ind: iAgribusiness! },
    { name: "PT Besland Pertiwi",                            ind: iManufacturing! },
    { name: "PT SH Garment",                                 ind: iTextile! },
    { name: "PT Multi Warna Karpetindo",                     ind: iTextile! },
    { name: "PT Purnama Asih",                               ind: iManufacturing! },
    { name: "PT Dong Yang Illust Indonesia",                 ind: iManufacturing! },
    { name: "PT Solusi Digital Nusantara",                   ind: iIT! },
    { name: "PT Teknologi Maju Indonesia",                   ind: iIT! },
  ];

  const companyDocs = await Company.insertMany(
    companiesRaw.map((c) => ({
      name: c.name,
      normalizedName: c.name.toLowerCase(),
      industry: { masterId: c.ind._id, name: c.ind.name },
      isActive: true,
    })),
  );
  console.log(`[SEED] Companies: ${companyDocs.length}`);

  const co = (i: number) => companyDocs[i % companyDocs.length]!;

  // -------------------------------------------------------------------------
  // 6. Super Admin Users
  // -------------------------------------------------------------------------
  const adminDocs = await User.insertMany(
    SUPER_ADMINS.map(u => ({
      name: u.name,
      email: u.email,
      role: "super_admin",
      organizationName: "PT. XYZ Operations",
      isActive: true,
      lastLoginAt: null,
      permissions: [],
    }))
  );
  console.log(`[SEED] Users created: ${adminDocs.length} super_admin\n`);

  const primaryAdmin = adminDocs[0]!;

  // -------------------------------------------------------------------------
  // 7. Standard Form Fields (shared across all events)
  // -------------------------------------------------------------------------
  const fIdName      = uid();
  const fIdPhone     = uid();
  const fIdCorpEmail = uid();
  const fIdPersEmail = uid();
  const fIdDept      = uid();
  const fIdJobTitle  = uid();
  const fIdCity      = uid();

  const formFields = [
    {
      fieldId: fIdName, key: "full_name", label: "Full Name",
      type: "text" as const, order: 1, isFixed: true,
      placeholder: "Enter your full name",
      validation: { required: true, minLength: 2, maxLength: 100 },
      isActive: true,
    },
    {
      fieldId: fIdPhone, key: "phone", label: "Phone Number",
      type: "phone" as const, order: 2, isFixed: true,
      placeholder: "+62xxxxxxxxxx",
      validation: { required: false },
      isActive: true,
    },
    {
      fieldId: fIdCorpEmail, key: "corporate_email", label: "Corporate Email",
      type: "email" as const, order: 3, isFixed: true,
      placeholder: "name@company.com",
      validation: { required: false },
      isActive: true,
    },
    {
      fieldId: fIdPersEmail, key: "personal_email", label: "Personal Email",
      type: "email" as const, order: 4, isFixed: false,
      placeholder: "name@gmail.com",
      validation: { required: false },
      isActive: true,
    },
    {
      fieldId: fIdDept, key: "department", label: "Department",
      type: "radio" as const, order: 5, isFixed: false,
      options: [
        { value: "HR",         label: "HR",         isDefault: false },
        { value: "IT",         label: "IT",         isDefault: false },
        { value: "Finance",    label: "Finance",    isDefault: false },
        { value: "Operations", label: "Operations", isDefault: false },
        { value: "Other",      label: "Other",      isDefault: false },
      ],
      validation: { required: false },
      isActive: true,
    },
    {
      fieldId: fIdJobTitle, key: "job_title", label: "Job Title",
      type: "text" as const, order: 6, isFixed: false,
      placeholder: "e.g. HR Manager",
      validation: { required: false, maxLength: 100 },
      isActive: true,
    },
    {
      fieldId: fIdCity, key: "city", label: "City",
      type: "text" as const, order: 7, isFixed: false,
      placeholder: "e.g. Jakarta",
      validation: { required: false },
      isActive: true,
    },
  ];

  // Frozen snapshot fields (no placeholder / helpText / validation)
  const snapshotFields = formFields.map(f => ({
    fieldId: f.fieldId,
    key:     f.key,
    label:   f.label,
    type:    f.type,
    order:   f.order,
    isFixed: f.isFixed,
    ...("options" in f && f.options ? { options: f.options } : {}),
  }));

  // -------------------------------------------------------------------------
  // 8. Events (15)
  // -------------------------------------------------------------------------
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const eventData = [
    // Index 0 — special: super_admin participants will be registered here
    {
      title:       "Annual HR Summit 2025",
      description: "A premier gathering for HR leaders and professionals across Indonesia to discuss emerging trends, regulatory updates, and best practices in human resource management.",
      category:    "HR Forum",
      industry:    iManufacturing!,
      eventDate:   new Date("2025-03-15T08:00:00+07:00"),
      location:    "Jakarta Convention Center, Jakarta",
      status:      "done" as const,
    },
    {
      title:       "Tech Innovation Expo 2025",
      description: "An exhibition showcasing the latest technology innovations from leading companies across Southeast Asia, featuring product demos, keynote sessions, and networking opportunities.",
      category:    "Exhibition",
      industry:    iIT!,
      eventDate:   new Date("2025-04-20T09:00:00+07:00"),
      location:    "Bali Nusa Dua Convention Center, Bali",
      status:      "done" as const,
    },
    {
      title:       "Manufacturing Excellence Forum",
      description: "A forum for manufacturing industry leaders to share insights on operational excellence, lean manufacturing principles, and quality management systems.",
      category:    "Conference",
      industry:    iManufacturing!,
      eventDate:   new Date("2025-05-10T08:30:00+07:00"),
      location:    "Grand Ballroom Hotel Mulia, Bandung",
      status:      "done" as const,
    },
    {
      title:       "Digital Transformation Workshop",
      description: "A hands-on workshop guiding organizations through their digital transformation journey, covering cloud migration, AI adoption, and change management strategies.",
      category:    "Workshop",
      industry:    iIT!,
      eventDate:   new Date("2025-10-08T09:00:00+07:00"),
      location:    "Jakarta Marriott Hotel, Jakarta",
      status:      "ongoing" as const,
    },
    {
      title:       "Industry Safety & Compliance Seminar",
      description: "A seminar addressing occupational health and safety standards, regulatory compliance, and risk management practices for industrial companies.",
      category:    "Seminar",
      industry:    iManufacturing!,
      eventDate:   new Date("2025-11-15T08:00:00+07:00"),
      location:    "Sheraton Surabaya Hotel & Towers, Surabaya",
      status:      "registration" as const,
    },
    {
      title:       "Supply Chain Management Conference",
      description: "A comprehensive conference on modern supply chain strategies, logistics optimization, and resilience planning for Indonesian manufacturers and distributors.",
      category:    "Conference",
      industry:    iManufacturing!,
      eventDate:   new Date("2025-12-05T09:00:00+07:00"),
      location:    "Grand Hyatt Jakarta, Jakarta",
      status:      "upcoming" as const,
    },
    {
      title:       "Leadership & People Development Forum",
      description: "A forum for HR and business leaders to explore leadership development frameworks, talent management strategies, and employee engagement best practices.",
      category:    "Forum",
      industry:    iManufacturing!,
      eventDate:   new Date("2025-11-22T08:00:00+07:00"),
      location:    "Pullman Jakarta Central Park, Jakarta",
      status:      "registration" as const,
    },
    {
      title:       "Sustainable Energy Forum",
      description: "A forum exploring sustainable energy solutions, green manufacturing processes, and renewable energy adoption strategies for industrial companies.",
      category:    "Forum",
      industry:    iEnergy!,
      eventDate:   new Date("2025-02-28T09:00:00+07:00"),
      location:    "Hotel Borobudur Jakarta, Jakarta",
      status:      "done" as const,
    },
    {
      title:       "Automotive Industry Networking Night",
      description: "An exclusive networking event connecting automotive industry professionals, suppliers, and distributors across Indonesia for collaboration and business development.",
      category:    "Networking",
      industry:    iAutomotive!,
      eventDate:   new Date("2025-06-18T17:00:00+07:00"),
      location:    "The Ritz-Carlton Jakarta, Mega Kuningan, Jakarta",
      status:      "done" as const,
    },
    {
      title:       "HR Analytics & Data Summit",
      description: "A data-focused summit helping HR professionals leverage people analytics, workforce planning tools, and data-driven decision-making to transform their organizations.",
      category:    "Conference",
      industry:    iIT!,
      eventDate:   new Date("2025-12-12T09:00:00+07:00"),
      location:    "Conrad Bali Resort & Spa, Bali",
      status:      "upcoming" as const,
    },
    {
      title:       "Textile & Garment Industry Meeting",
      description: "An industry meeting for textile and garment manufacturers to discuss export opportunities, regulatory updates, and sustainable textile production practices.",
      category:    "Industry Meeting",
      industry:    iTextile!,
      eventDate:   new Date("2025-07-25T08:30:00+07:00"),
      location:    "Grand Aston Yogyakarta, Yogyakarta",
      status:      "done" as const,
    },
    {
      title:       "Women in Leadership Conference",
      description: "A conference celebrating and empowering women leaders across Indonesian industries, featuring keynote speakers, panel discussions, and mentorship sessions.",
      category:    "Conference",
      industry:    iManufacturing!,
      eventDate:   new Date("2025-11-05T08:00:00+07:00"),
      location:    "Hotel Indonesia Kempinski, Jakarta",
      status:      "registration" as const,
    },
    {
      title:       "Smart Factory & Automation Expo",
      description: "An exposition featuring the latest developments in smart manufacturing, industrial automation, IoT integration, and Industry 4.0 technologies.",
      category:    "Exhibition",
      industry:    iManufacturing!,
      eventDate:   new Date("2025-12-20T09:00:00+07:00"),
      location:    "Jakarta International Expo, Jakarta",
      status:      "draft" as const,
    },
    {
      title:       "Electronics Manufacturing Seminar",
      description: "A seminar for electronics manufacturers covering production quality standards, component sourcing strategies, and export market opportunities.",
      category:    "Seminar",
      industry:    iElectronics!,
      eventDate:   new Date("2025-09-10T09:00:00+07:00"),
      location:    "Novotel Bandung, Bandung",
      status:      "cancelled" as const,
    },
    {
      title:       "Regional Agribusiness Symposium",
      description: "A symposium connecting agribusiness stakeholders from across Sumatra and Java to discuss agricultural technology, market expansion, and supply chain integration.",
      category:    "Symposium",
      industry:    iAgribusiness!,
      eventDate:   new Date("2025-08-14T08:00:00+07:00"),
      location:    "Aryaduta Medan, Medan",
      status:      "done" as const,
    },
    {
      fieldId: CUSTOM_FIELD_IDS.shortText,
      key: "short_text_q",
      label: "Pertanyaan Text Singkat",
      type: "text" as const,
      order: 9,
      isFixed: false,
      placeholder: "Jawaban singkat",
      validation: { required: true },
      isActive: true,
    },
    {
      fieldId: CUSTOM_FIELD_IDS.emailAlt,
      key: "email_q",
      label: "Email Alternatif",
      type: "email" as const,
      order: 10,
      isFixed: false,
      validation: { required: true },
      isActive: true,
    },
    {
      fieldId: CUSTOM_FIELD_IDS.phoneAlt,
      key: "phone_q",
      label: "Nomor WhatsApp",
      type: "phone" as const,
      order: 11,
      isFixed: false,
      validation: { required: true },
      isActive: true,
    },
    {
      fieldId: CUSTOM_FIELD_IDS.number,
      key: "number_q",
      label: "Jumlah Karyawan",
      type: "number" as const,
      order: 12,
      isFixed: false,
      validation: { required: true },
      isActive: true,
    },
    {
      fieldId: CUSTOM_FIELD_IDS.textarea,
      key: "textarea_q",
      label: "Ceritakan tentang perusahaanmu",
      type: "textarea" as const,
      order: 13,
      isFixed: false,
      validation: { required: true },
      isActive: true,
    },
    {
      fieldId: CUSTOM_FIELD_IDS.radio,
      key: "radio_q",
      label: "Pilih Paket",
      type: "radio" as const,
      order: 14,
      isFixed: false,
      options: [
        { value: "Basic", label: "Basic", isDefault: false },
        { value: "Pro", label: "Pro", isDefault: false },
        { value: "Enterprise", label: "Enterprise", isDefault: false },
      ],
      validation: { required: true },
      isActive: true,
    },
    {
      fieldId: CUSTOM_FIELD_IDS.checkbox,
      key: "checkbox_q",
      label: "Produk yang digunakan",
      type: "checkbox" as const,
      order: 15,
      isFixed: false,
      options: [
        { value: "CRM", label: "CRM", isDefault: false },
        { value: "ERP", label: "ERP", isDefault: false },
        { value: "HRIS", label: "HRIS", isDefault: false },
        { value: "Analytics", label: "Analytics", isDefault: false },
      ],
      validation: { required: true },
      isActive: true,
    },
    {
      fieldId: CUSTOM_FIELD_IDS.select,
      key: "select_q",
      label: "Sumber Informasi",
      type: "select" as const,
      order: 16,
      isFixed: false,
      options: [
        { value: "instagram", label: "Instagram", isDefault: false },
        { value: "linkedin", label: "LinkedIn", isDefault: false },
        { value: "website", label: "Website", isDefault: false },
      ],
      validation: { required: true },
      isActive: true,
    },
    {
      fieldId: CUSTOM_FIELD_IDS.date,
      key: "date_q",
      label: "Tanggal Kunjungan",
      type: "date" as const,
      order: 17,
      isFixed: false,
      validation: { required: false },
      isActive: true,
    },
  ];

  const eventDocs = await Event.insertMany(
    eventData.map(e => ({
      title:    e.title,
      slug:     slugify(e.title),
      description: e.description,
      category: e.category,
      industry: { refId: e.industry._id, name: e.industry.name },
      eventDate: e.eventDate,
      location: e.location,
      status:   e.status,
      registrationForm: {
        version:     1,
        fields:      formFields,
        publishedAt: new Date(e.eventDate.getTime() - THIRTY_DAYS_MS),
      },
      surveyId:  null,
      createdBy: primaryAdmin._id,
      updatedBy: null,
    }))
  );
  console.log(`[SEED] Events created: ${eventDocs.length}\n`);

  // -------------------------------------------------------------------------
  // 9. Participant pool (regular participants)
  // -------------------------------------------------------------------------
  const firstNames = [
    "James",   "Emma",      "Oliver",   "Sophia",   "William",
    "Ava",     "Noah",      "Isabella", "Liam",     "Mia",
    "Lucas",   "Charlotte", "Ethan",    "Amelia",   "Mason",
    "Harper",  "Logan",     "Evelyn",   "Aiden",    "Abigail",
    "Jackson", "Emily",     "Elijah",   "Elizabeth","Grayson",
    "Sofia",   "Michael",   "Avery",    "Benjamin", "Ella",
    "Carter",  "Scarlett",  "Sebastian","Victoria", "Henry",
    "Madison", "Alexander", "Luna",     "Jack",     "Grace",
    "Owen",    "Chloe",     "Samuel",   "Penelope", "Leo",
    "Layla",   "Ryan",      "Riley",    "Daniel",   "Zoey",
    "Nathan",  "Nora",      "Wyatt",    "Hannah",   "Julian",
    "Lillian", "Dylan",     "Addison",  "Caleb",    "Aubrey",
  ];

  const lastNames = [
    "Smith",    "Johnson",  "Williams", "Brown",    "Jones",
    "Garcia",   "Miller",   "Davis",    "Wilson",   "Anderson",
    "Taylor",   "Thomas",   "Moore",    "Jackson",  "White",
    "Harris",   "Martin",   "Thompson", "Young",    "Hernandez",
    "Lewis",    "Lee",      "Walker",   "Hall",     "Allen",
    "King",     "Wright",   "Scott",    "Green",    "Baker",
    "Adams",    "Nelson",   "Hill",     "Mitchell", "Campbell",
    "Roberts",  "Carter",   "Phillips", "Evans",    "Turner",
    "Torres",   "Parker",   "Collins",  "Edwards",  "Stewart",
    "Flores",   "Morris",   "Nguyen",   "Murphy",   "Cook",
    "Rogers",   "Morgan",   "Peterson", "Cooper",   "Reed",
    "Bailey",   "Bell",     "Gomez",    "Kelly",    "Howard",
  ];

  const deptOptions = ["HR", "IT", "Finance", "Operations", "Other"];
  const sourceChannels = ["LinkedIn", "Email", "Website", "Friend", "Social Media"];

  const allJobTitles = [
    jtHRManager!, jtHRBPManager!, jtHRGAManager!, jtHRStaff!,
    jtManager!, jtSupervisor!, jtITManager!, jtITStaff!,
    jtDirector!, jtAssistantManager!, jtDivisionHead!, jtAnalyst!,
  ];

  const allCities = [
    cJakarta!, cBandung!, cSurabaya!, cBali!, cYogyakarta!,
    cMedan!, cKarawang!, cPurwakarta!, cBekasi!,
  ];

  const POOL_SIZE = 60;

  // Build parallel metadata array (used when creating answers)
  const poolMeta = Array.from({ length: POOL_SIZE }, (_, i) => {
    const firstName    = firstNames[i % firstNames.length]!;
    const lastName     = lastNames[i % lastNames.length]!;
    const fullName     = `${firstName} ${lastName}`;
    const jt           = allJobTitles[i % allJobTitles.length]!;
    const cityDoc      = allCities[i % allCities.length]!;
    const compDoc      = co(i);
    const industryDoc  = [
      iManufacturing!, iTextile!, iAutomotive!, iGarment!,
      iIT!, iElectronics!, iFootwear!, iEnergy!, iAgribusiness!,
    ][i % 9]!;

    return {
      fullName,
      phone:        `0812${String(i).padStart(8, "0")}`,
      companyEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.co.id`,
      personalEmail:`${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@gmail.com`,
      dept:         deptOptions[i % deptOptions.length]!,
      jtName:       jt.name,
      cityName:     cityDoc.name,
      // snapshot shapes
      company:      { companyId: compDoc._id as Types.ObjectId, name: compDoc.name },
      industry:     { refId: industryDoc._id as Types.ObjectId, name: industryDoc.name },
      jobTitle:     { refId: jt._id as Types.ObjectId,          name: jt.name },
      city:         { refId: cityDoc._id as Types.ObjectId,     name: cityDoc.name },
      sourceChannel:{ code: pick(sourceChannels), otherText: null as string | null },
      defaultParticipantType: "participant" as const,
    };
  });

  const poolDocs = await Participant.insertMany(
    poolMeta.map(m => ({
      fullName:             m.fullName,
      normalizedFullName:   m.fullName.toLowerCase(),
      personalEmail:        m.personalEmail,
      companyEmail:         m.companyEmail,
      phone:                m.phone,
      company:              m.company,
      industry:             m.industry,
      jobTitle:             m.jobTitle,
      city:                 m.city,
      defaultParticipantType: m.defaultParticipantType,
      sourceChannel:        m.sourceChannel,
      identityFingerprint:  null,
      notes:                null,
      isActive:             true,
    }))
  );
  console.log(`[SEED] Participant pool: ${poolDocs.length}`);

  // -------------------------------------------------------------------------
  // 10. Super admin participants (for event 0)
  // -------------------------------------------------------------------------
  const saCompanyDoc  = co(18); // PT Solusi Digital Nusantara — IT
  const saIndustryDoc = iIT!;
  const saJobTitleDoc = jtHRManager!;
  const saCityDoc     = cJakarta!;

  const saParticipantDocs = await Participant.insertMany(
    SUPER_ADMINS.map((u, i) => ({
      fullName:             u.name,
      normalizedFullName:   u.name.toLowerCase(),
      personalEmail:        u.email,
      companyEmail:         null,
      phone:                `0811${String(i).padStart(8, "0")}`,
      company:   { companyId: saCompanyDoc._id,  name: saCompanyDoc.name },
      industry:  { refId: saIndustryDoc._id,     name: saIndustryDoc.name },
      jobTitle:  { refId: saJobTitleDoc._id,      name: saJobTitleDoc.name },
      city:      { refId: saCityDoc._id,          name: saCityDoc.name },
      defaultParticipantType: "participant" as const,
      sourceChannel: { code: "LinkedIn", otherText: null },
      identityFingerprint: null,
      notes: null,
      isActive: true,
    })),
  );
  console.log(`[SEED] Super admin participants: ${saParticipantDocs.length}\n`);

  // -------------------------------------------------------------------------
  // 11. Registrations
  // -------------------------------------------------------------------------

  // Weighted status pool per event lifecycle state
  const statusWeights: Record<string, ReadonlyArray<"pending" | "approved" | "rejected" | "checked_in">> = {
    done:         ["checked_in", "checked_in", "checked_in", "approved", "pending",  "rejected"],
    ongoing:      ["checked_in", "checked_in", "approved",   "approved", "pending"],
    registration: ["pending",    "pending",    "approved",   "approved", "rejected"],
    upcoming:     ["pending",    "pending",    "pending",    "approved"],
    draft:        ["pending",    "pending",    "approved"],
    cancelled:    ["pending",    "rejected",   "rejected"],
  };

  function randomRegStatus(
    eventStatus: string,
  ): "pending" | "approved" | "rejected" | "checked_in" {
    const pool = statusWeights[eventStatus] ?? ["pending"];
    return pick(pool);
  }

  interface RegMeta {
    fullName:     string;
    phone:        string | null;
    companyEmail: string | null;
    dept:         string;
    jtName:       string;
    cityName:     string;
    company:      { companyId: Types.ObjectId | null; name: string | null };
    industry:     { refId: Types.ObjectId | null; name: string | null };
    jobTitle:     { refId: Types.ObjectId | null; name: string | null };
    city:         { refId: Types.ObjectId | null; name: string | null };
    participantType: "participant" | "exhibitor";
  }

  function buildRegistration(
    evDoc: (typeof eventDocs)[0],
    participantId: Types.ObjectId,
    meta: RegMeta,
    adminUserId: Types.ObjectId,
  ) {
    const regStatus  = randomRegStatus(evDoc.status);
    const isApproved = regStatus === "approved" || regStatus === "checked_in";
    const isCheckedIn= regStatus === "checked_in";
    const isRejected = regStatus === "rejected";

    const approvedAt = isApproved
      ? new Date(evDoc.eventDate.getTime() - 7 * 24 * 60 * 60 * 1000)
      : null;

    const qrCode = isApproved ? `QR-${uid()}` : null;

    return {
      eventId:         evDoc._id,
      participantId,
      participantType: meta.participantType,
      status:          regStatus,

      approval: {
        approvedBy:      isApproved ? adminUserId : null,
        approvedAt,
        rejectedBy:      isRejected ? adminUserId : null,
        rejectedAt:      isRejected
          ? new Date(evDoc.eventDate.getTime() - 5 * 24 * 60 * 60 * 1000)
          : null,
        rejectionReason: isRejected
          ? "Participant quota for this department has been filled."
          : null,
      },

      formSnapshot: { version: 1, fields: snapshotFields },

      answers: [
        { fieldId: fIdName,      key: "full_name",       label: "Full Name",       type: "text",  value: meta.fullName },
        { fieldId: fIdPhone,     key: "phone",           label: "Phone Number",    type: "phone", value: meta.phone ?? "" },
        { fieldId: fIdCorpEmail, key: "corporate_email", label: "Corporate Email", type: "email", value: meta.companyEmail ?? "" },
        { fieldId: fIdPersEmail, key: "personal_email",  label: "Personal Email",  type: "email", value: "" },
        { fieldId: fIdDept,      key: "department",      label: "Department",      type: "radio", value: meta.dept },
        { fieldId: fIdJobTitle,  key: "job_title",       label: "Job Title",       type: "text",  value: meta.jtName },
        { fieldId: fIdCity,      key: "city",            label: "City",            type: "text",  value: meta.cityName },
      ],

      companySnapshot:  meta.company,
      industrySnapshot: meta.industry,
      jobTitleSnapshot: meta.jobTitle,
      citySnapshot:     meta.city,

      ticket: qrCode
        ? { qrCode, issuedAt: approvedAt!, reissueCount: 0, isActive: true }
        : null,

      checkIn: {
        isAttended:  isCheckedIn,
        checkedInAt: isCheckedIn ? evDoc.eventDate : null,
        checkedInBy: isCheckedIn ? adminUserId : null,
        scanMethod:  "qr",
        notes:       null,
      },
    };
  }

  const allRegistrations: ReturnType<typeof buildRegistration>[] = [];

  // --- Event 0: register all super_admin participants ---
  const event0 = eventDocs[0]!;
  for (const saP of saParticipantDocs) {
    allRegistrations.push(
      buildRegistration(
        event0,
        saP._id as Types.ObjectId,
        {
          fullName:     saP.fullName,
          phone:        saP.phone ?? null,
          companyEmail: null,
          dept:         "HR",
          jtName:       saJobTitleDoc.name,
          cityName:     saCityDoc.name,
          company:   { companyId: saCompanyDoc._id as Types.ObjectId, name: saCompanyDoc.name },
          industry:  { refId: saIndustryDoc._id as Types.ObjectId,   name: saIndustryDoc.name },
          jobTitle:  { refId: saJobTitleDoc._id as Types.ObjectId,    name: saJobTitleDoc.name },
          city:      { refId: saCityDoc._id as Types.ObjectId,        name: saCityDoc.name },
          participantType: "participant",
        },
        primaryAdmin._id as Types.ObjectId,
      )
    );
  }
  console.log(`[SEED] Event 0 "${event0.title}": ${saParticipantDocs.length} registrations (super_admin participants)`);

  // --- Events 1–14: random participants from pool ---
  for (let evIdx = 1; evIdx < eventDocs.length; evIdx++) {
    const evDoc  = eventDocs[evIdx]!;
    const count  = randInt(5, 15);
    const picked = shuffle([...Array(POOL_SIZE).keys()]).slice(0, count);

    for (const idx of picked) {
      const pDoc = poolDocs[idx]!;
      const meta = poolMeta[idx]!;
      allRegistrations.push(
        buildRegistration(
          evDoc,
          pDoc._id as Types.ObjectId,
          {
            fullName:     meta.fullName,
            phone:        meta.phone,
            companyEmail: meta.companyEmail,
            dept:         meta.dept,
            jtName:       meta.jtName,
            cityName:     meta.cityName,
            company:      meta.company,
            industry:     meta.industry,
            jobTitle:     meta.jobTitle,
            city:         meta.city,
            participantType: "participant",
          },
          primaryAdmin._id as Types.ObjectId,
        )
      );
    }
    console.log(`[SEED] Event ${evIdx} "${evDoc.title}": ${count} registrations`);
  }

  await Registration.insertMany(allRegistrations);
  console.log(`\n[SEED] Total registrations inserted: ${allRegistrations.length}`);

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------
  console.log("\n[SEED] Complete.\n");
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[SEED] Fatal error:", err);
  process.exit(1);
});
