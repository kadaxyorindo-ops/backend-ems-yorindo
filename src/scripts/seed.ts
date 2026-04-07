/**
 * @file seed.ts
 * @description Database seeder for development and testing.
 *
 * Seeds all collections with realistic sample data modeled after
 * PT. XYZ HR Forum event records in the Purwakarta industrial area.
 *
 * Usage:
 *   npx tsx src/scripts/seed.ts
 *
 * WARNING: Drops and recreates all seeded collections.
 * Do NOT run against a production database.
 */

import "dotenv/config";
import mongoose, { Types } from "mongoose";
import { connectDB } from "../config/db.js";
import { Industry } from "../models/schemas/industry.schema.js";
import { City } from "../models/schemas/city.schema.js";
import { JobTitle } from "../models/schemas/job-title.schema.js";
import { Company } from "../models/schemas/company.schema.js";
import { User } from "../models/schemas/user.schema.js";
import { Event } from "../models/schemas/event.schema.js";
import { Participant } from "../models/schemas/participant.schema.js";
import { Registration } from "../models/schemas/registration.schema.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  await connectDB();
  console.log("\n[SEED] Starting — clearing existing data...\n");

  await Promise.all([
    Industry.deleteMany({}),
    City.deleteMany({}),
    JobTitle.deleteMany({}),
    Company.deleteMany({}),
    User.deleteMany({}),
    Event.deleteMany({}),
    Participant.deleteMany({}),
    Registration.deleteMany({}),
  ]);

  // -------------------------------------------------------------------------
  // 1. Industries
  // -------------------------------------------------------------------------
  const [
    iManufaktur, iTekstil, iOtomotif, iPakaianJadi,
    iIT, iElektronik, iAlasKaki, iAkumulator, iAgribisnis,
  ] = await Industry.insertMany([
    { name: "Manufacturing",            normalizedName: "manufacturing" },
    { name: "Textile",                 normalizedName: "textile" },
    { name: "Automotive",              normalizedName: "automotive" },
    { name: "Garment Industry",        normalizedName: "garment industry" },
    { name: "Information Technology",  normalizedName: "information technology" },
    { name: "Electronic Components",   normalizedName: "electronic components" },
    { name: "Footwear",                normalizedName: "footwear" },
    { name: "Battery & Energy",        normalizedName: "battery & energy" },
    { name: "Agribusiness",            normalizedName: "agribusiness" },
  ]);
  console.log("[SEED] Industries: 9");

  // -------------------------------------------------------------------------
  // 2. Cities
  // -------------------------------------------------------------------------
  const [cPurwakarta, cBekasi, cKarawang, cBandung, cJakarta, cSubang] =
    await City.insertMany([
      { name: "Purwakarta", normalizedName: "purwakarta", province: "Jawa Barat",  country: "Indonesia" },
      { name: "Bekasi",     normalizedName: "bekasi",     province: "Jawa Barat",  country: "Indonesia" },
      { name: "Karawang",   normalizedName: "karawang",   province: "Jawa Barat",  country: "Indonesia" },
      { name: "Bandung",    normalizedName: "bandung",    province: "Jawa Barat",  country: "Indonesia" },
      { name: "Jakarta",    normalizedName: "jakarta",    province: "DKI Jakarta", country: "Indonesia" },
      { name: "Subang",     normalizedName: "subang",     province: "Jawa Barat",  country: "Indonesia" },
    ]);
  console.log("[SEED] Cities: 6");

  // -------------------------------------------------------------------------
  // 3. Job Titles
  // -------------------------------------------------------------------------
  const [
    jtHRManager, jtHRBPManager, jtHRGAManager, jtHRGAStaff,
    jtAsstManager, jtSrAsstManager, jtManager, jtSupervisor,
    jtITManager, jtITStaff, jtKepDiv, jtAssMgr,
  ] = await JobTitle.insertMany([
    { name: "HR Manager",               normalizedName: "hr manager" },
    { name: "HRBP Manager",             normalizedName: "hrbp manager" },
    { name: "HRGA Manager",             normalizedName: "hrga manager" },
    { name: "HR / GA Staff",            normalizedName: "hr / ga staff" },
    { name: "Assistant Manager",        normalizedName: "assistant manager" },
    { name: "Senior Assistant Manager", normalizedName: "senior assistant manager" },
    { name: "Manager",                  normalizedName: "manager" },
    { name: "Supervisor",               normalizedName: "supervisor" },
    { name: "IT Manager",               normalizedName: "it manager" },
    { name: "IT Staff",                 normalizedName: "it staff" },
    { name: "Division Head",             normalizedName: "division head" },
    { name: "Junior Manager",           normalizedName: "junior manager" },
  ]);
  console.log("[SEED] Job Titles: 12");

  // -------------------------------------------------------------------------
  // 4. Companies
  // -------------------------------------------------------------------------
  const companiesRaw = [
    { name: "PT Seyang Activewear",                          ind: iPakaianJadi! },
    { name: "PT Purnama Asih Sur",                           ind: iManufaktur! },
    { name: "PT Adient Automotive Indonesia",                ind: iOtomotif! },
    { name: "PT Dong Yang Illust Indonesia",                 ind: iManufaktur! },
    { name: "PT SANWA MUSEN INDONESIA",                      ind: iElektronik! },
    { name: "PT PK Manufacturing Indonesia",                 ind: iManufaktur! },
    { name: "PT Japfa",                                      ind: iAgribisnis! },
    { name: "PT Indo-Rama Synthetics Tbk",                   ind: iTekstil! },
    { name: "PT SH Garment",                                 ind: iTekstil! },
    { name: "PT Multi Warna Karpetindo Agung",               ind: iTekstil! },
    { name: "PT INDONESIA SIMON",                            ind: iAlasKaki! },
    { name: "PT Hitachi Construction Machinery Indonesia",   ind: iManufaktur! },
    { name: "PT FURUKAWA INDOMOBIL BATTERY MANUFACTURING",   ind: iAkumulator! },
    { name: "PT Malindo Feedmill Tbk",                       ind: iAgribisnis! },
    { name: "PT Besland Pertiwi",                            ind: iManufaktur! },
    { name: "PT Yamaha Motor Parts Manufacturing Indonesia", ind: iOtomotif! },
    { name: "PT Astra Honda Motor",                          ind: iOtomotif! },
    { name: "PT Len Industri",                               ind: iElektronik! },
  ];

  const companyDocs = await Company.insertMany(
    companiesRaw.map(c => ({
      name: c.name,
      normalizedName: c.name.toLowerCase(),
      industry: { masterId: c.ind._id, name: c.ind.name },
      isActive: true,
    }))
  );
  console.log(`[SEED] Companies: ${companyDocs.length}`);

  // Quick lookup by index
  const co = (i: number) => companyDocs[i]!;

  // -------------------------------------------------------------------------
  // 5. Internal Users (staff)
  // -------------------------------------------------------------------------
  const [superAdmin, admin1, admin2] = await User.insertMany([
    {
      name: "John Smith",
      email: "john.smith@yorindo.co.id",
      role: "super_admin",
      organizationName: "PT. XYZ Operations",
      isActive: true,
      lastLoginAt: new Date("2025-10-23T08:00:00Z"),
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@yorindo.co.id",
      role: "admin",
      organizationName: "PT. XYZ Operations",
      isActive: true,
      lastLoginAt: new Date("2025-10-23T07:30:00Z"),
    },
    {
      name: "Michael Chen",
      email: "michael.chen@yorindo.co.id",
      role: "admin",
      organizationName: "PT. XYZ Operations",
      isActive: true,
      lastLoginAt: new Date("2025-10-22T15:00:00Z"),
    },
  ]);
  console.log("[SEED] Users: 3");

  // -------------------------------------------------------------------------
  // 6. Event
  // -------------------------------------------------------------------------
  const fIdName       = uid();
  const fIdPhone      = uid();
  const fIdCompEmail  = uid();
  const fIdPersEmail  = uid();
  const fIdDept       = uid();
  const fIdJabatan    = uid();
  const fIdJenisLay   = uid();
  const fIdAsal       = uid();

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
      placeholder: "08xxxxxxxxxx",
      validation: { required: false },
      isActive: true,
    },
    {
      fieldId: fIdCompEmail, key: "company_email", label: "Company Email",
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
        { value: "HR", label: "HR", isDefault: false },
        { value: "IT", label: "IT", isDefault: false },
        { value: "Finance", label: "Finance", isDefault: false },
        { value: "Operations", label: "Operations", isDefault: false },
        { value: "Other", label: "Other", isDefault: false },
      ],
      validation: { required: false },
      isActive: true,
    },
    {
      fieldId: fIdJabatan, key: "jabatan", label: "Job Title",
      type: "text" as const, order: 6, isFixed: false,
      placeholder: "e.g. HR Manager",
      validation: { required: false, maxLength: 100 },
      isActive: true,
    },
    {
      fieldId: fIdJenisLay, key: "jenis_layanan", label: "Type of Service",
      type: "text" as const, order: 7, isFixed: false,
      placeholder: "e.g. Manufacturing",
      validation: { required: false },
      isActive: true,
    },
    {
      fieldId: fIdAsal, key: "asal_kota", label: "City of Origin",
      type: "text" as const, order: 8, isFixed: false,
      placeholder: "e.g. Jakarta",
      validation: { required: false },
      isActive: true,
    },
  ];

  const eventDoc = await Event.create({
    title: "HR Forum Purwakarta – October 2025",
    description:
      "A discussion and networking forum for HR professionals in the Purwakarta industrial area and surrounding regions. " +
      "Covering employment trends, the latest regulations, and best practices in human resources management.",
    category: "HR Forum",
    eventDate: new Date("2025-10-23T08:00:00+07:00"),
    location: "Hotel Sutan Raja Purwakarta, Jawa Barat",
    status: "closed",
    maxCapacity: 200,
    registrationForm: {
      version: 1,
      publishedAt: new Date("2025-09-01T00:00:00Z"),
      fields: formFields,
    },
    surveyId: null,
    createdBy: superAdmin!._id,
    updatedBy: admin1!._id,
  });
  console.log(`[SEED] Event: "${eventDoc.title}"`);

  // -------------------------------------------------------------------------
  // 7. Participants (55 records)
  // -------------------------------------------------------------------------

  // Data shape for building participants
  interface SnapRef { _id: Types.ObjectId; name: string; }
  interface PRaw {
    fullName: string;
    coIdx: number;        // companyDocs index
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

  const pRaw: PRaw[] = [
    // --- PT Seyang Activewear (co 0, iPakaianJadi) ---
    { fullName: "Aan Prihantara",     coIdx: 0, ind: iPakaianJadi!, jt: jtHRManager!,    city: cPurwakarta!, dept: "HR",  jabatan: "HR Manager",              jenisLayanan: "Industri Pakaian Jadi",    companyEmail: "aan.p@seyang.co.id",         phone: "081211110001", type: "participant", status: "checked_in" },
    // --- PT Purnama Asih Sur (co 1, iManufaktur) ---
    { fullName: "Aang Enuh Nugraha",  coIdx: 1, ind: iManufaktur!,  jt: jtSupervisor!,   city: cPurwakarta!, dept: "IT",  jabatan: "Supervisor",               jenisLayanan: "Manufaktur",               companyEmail: "aang.en@purnama.co.id",       phone: "081211110002", type: "participant", status: "checked_in" },
    // --- PT Adient Automotive (co 2, iOtomotif) ---
    { fullName: "Acep Irawan",        coIdx: 2, ind: iOtomotif!,    jt: jtITStaff!,      city: cPurwakarta!, dept: "IT",  jabatan: "IT Staff / IT Manager",    jenisLayanan: "Otomotif",                 companyEmail: "acep.i@adient.co.id",         phone: "081211110003", type: "participant", status: "checked_in" },
    // --- PT Dong Yang Illust (co 3, iManufaktur) ---
    { fullName: "Achmad Fauzi",       coIdx: 3, ind: iManufaktur!,  jt: jtManager!,      city: cPurwakarta!, dept: "HR",  jabatan: "Manager",                  jenisLayanan: "Manufaktur",               companyEmail: "achmad.f@dongyang.co.id",     phone: "081211110004", type: "participant", status: "checked_in" },
    // --- PT SANWA MUSEN (co 4, iElektronik) ---
    { fullName: "Afridar Mirza",      coIdx: 4, ind: iElektronik!,  jt: jtSupervisor!,   city: cPurwakarta!, dept: "HR",  jabatan: "SUPERVISOR",               jenisLayanan: "Komponen Elektronik",      companyEmail: "afridar.m@sanwa.co.id",       phone: "081211110005", type: "participant", status: "checked_in" },
    // --- PT PK Manufacturing (co 5, iManufaktur) ---
    { fullName: "Agus Mustopa",       coIdx: 5, ind: iManufaktur!,  jt: jtAsstManager!,  city: cPurwakarta!, dept: "IT",  jabatan: "Assistant Manager",        jenisLayanan: "Manufaktur",               companyEmail: "agus.m@pkmanufacturing.co.id",phone: "081211110006", type: "participant", status: "checked_in" },
    // --- PT Japfa (co 6, iAgribisnis) ---
    { fullName: "Ahmad Zamzam Z",     coIdx: 6, ind: iAgribisnis!,  jt: jtHRManager!,    city: cPurwakarta!, dept: "HR",  jabatan: "HR Manager",               jenisLayanan: "Manufaktur",               companyEmail: "ahmad.zz@japfa.co.id",        phone: "081211110007", type: "participant", status: "checked_in" },
    // --- PT Indo-Rama Synthetics (co 7, iTekstil) ---
    { fullName: "Akhmad Eka Hadi",    coIdx: 7, ind: iTekstil!,     jt: jtHRGAStaff!,   city: cPurwakarta!, dept: "HR",  jabatan: "HR / GA Staff / Manager",  jenisLayanan: "Tekstil",                  companyEmail: "akhmad.eh@indorama.co.id",    phone: "081211110008", type: "participant", status: "checked_in" },
    // --- PT SH Garment (co 8, iTekstil) ---
    { fullName: "Andi Dasril Daeng",  coIdx: 8, ind: iTekstil!,     jt: jtManager!,      city: cPurwakarta!, dept: "HR",  jabatan: "Manager",                  jenisLayanan: "Manufaktur",               companyEmail: "andi.dd@shgarment.co.id",     phone: "081211110009", type: "participant", status: "checked_in" },
    // --- PT Multi Warna Karpetindo (co 9, iTekstil) ---
    { fullName: "Andi Whidia Sulistya",coIdx: 9, ind: iTekstil!,    jt: jtSupervisor!,   city: cPurwakarta!, dept: "IT",  jabatan: "Supervisor",               jenisLayanan: "Manufaktur",               companyEmail: "andi.ws@multiwarna.co.id",    phone: "081211110010", type: "participant", status: "checked_in" },
    { fullName: "Andi Widhia Sulistya",coIdx: 9, ind: iTekstil!,    jt: jtHRGAStaff!,   city: cPurwakarta!, dept: "HR",  jabatan: "HR / GA Staff / Manager",  jenisLayanan: "Tekstil",                  companyEmail: "andi.ws2@multiwarna.co.id",   phone: "081211110011", type: "participant", status: "checked_in" },
    // --- PT INDONESIA SIMON (co 10, iAlasKaki) ---
    { fullName: "Andina Verlissa",    coIdx: 10, ind: iAlasKaki!,   jt: jtAsstManager!,  city: cPurwakarta!, dept: "IT",  jabatan: "ASSISTANT MANAGER",        jenisLayanan: "Alas Kaki",                companyEmail: "andina.v@indonesiasimon.co.id",phone:"081211110012", type: "participant", status: "checked_in" },
    // --- PT Hitachi Construction (co 11, iManufaktur) ---
    { fullName: "Andrianto",          coIdx: 11, ind: iManufaktur!, jt: jtSrAsstManager!,city: cPurwakarta!, dept: "HR",  jabatan: "Senior asst. Manager",     jenisLayanan: "Manufaktur",               companyEmail: "andrianto@hitachi-cm.co.id",  phone: "081211110013", type: "participant", status: "checked_in" },
    // --- PT FURUKAWA INDOMOBIL (co 12, iAkumulator) ---
    { fullName: "Andrie Herdiana",    coIdx: 12, ind: iAkumulator!, jt: jtHRGAManager!,  city: cPurwakarta!, dept: "HR",  jabatan: "HRGA Manager",             jenisLayanan: "Akumulator Listrik",       companyEmail: "andrie.h@furukawa-im.co.id",  phone: "081211110014", type: "participant", status: "checked_in" },
    // --- PT Malindo Feedmill (co 13, iAgribisnis) ---
    { fullName: "Angga",              coIdx: 13, ind: iAgribisnis!, jt: jtHRBPManager!,  city: cPurwakarta!, dept: "HR",  jabatan: "HRBP Manager",             jenisLayanan: "Manufaktur",               companyEmail: "angga@malindo.co.id",         phone: "081211110015", type: "participant", status: "checked_in" },
    // --- PT Besland Pertiwi (co 14, iManufaktur) ---
    { fullName: "Anna R",             coIdx: 14, ind: iManufaktur!, jt: jtAssMgr!,       city: cPurwakarta!, dept: "IT",  jabatan: "Asmen",                    jenisLayanan: "Manufaktur",               companyEmail: "anna.r@besland.co.id",        phone: "081211110016", type: "participant", status: "checked_in" },
    // --- PT Yamaha Motor Parts (co 15, iOtomotif) ---
    { fullName: "Antonius Wijaya",    coIdx: 15, ind: iOtomotif!,   jt: jtHRGAManager!,  city: cKarawang!,   dept: "HR",  jabatan: "HRGA Manager",             jenisLayanan: "Otomotif",                 companyEmail: "antonius.w@yamaha-parts.co.id",phone:"081211110017", type: "participant", status: "approved"   },
    { fullName: "Bintang Nurul H",    coIdx: 15, ind: iOtomotif!,   jt: jtSupervisor!,   city: cKarawang!,   dept: "IT",  jabatan: "Supervisor IT",            jenisLayanan: "Otomotif",                 companyEmail: "bintang.nh@yamaha-parts.co.id",phone:"081211110018", type: "participant", status: "approved"   },
    // --- PT Astra Honda Motor (co 16, iOtomotif) ---
    { fullName: "Cahyo Purnomo",      coIdx: 16, ind: iOtomotif!,   jt: jtHRManager!,    city: cBekasi!,     dept: "HR",  jabatan: "HR Manager",               jenisLayanan: "Otomotif",                 companyEmail: "cahyo.p@ahm.co.id",           phone: "081211110019", type: "participant", status: "approved"   },
    { fullName: "Dewi Lestari",       coIdx: 16, ind: iOtomotif!,   jt: jtHRGAStaff!,   city: cBekasi!,     dept: "HR",  jabatan: "HR / GA Staff",            jenisLayanan: "Otomotif",                 companyEmail: "dewi.l@ahm.co.id",            phone: "081211110020", type: "participant", status: "approved"   },
    // --- PT Len Industri (co 17, iElektronik) ---
    { fullName: "Eko Prasetyo",       coIdx: 17, ind: iElektronik!, jt: jtManager!,      city: cBandung!,    dept: "HR",  jabatan: "Manager",                  jenisLayanan: "Komponen Elektronik",      companyEmail: "eko.p@len.co.id",             phone: "081211110021", type: "participant", status: "pending"    },
    // --- PT Seyang (additional) ---
    { fullName: "Farhan Maulana",     coIdx: 0,  ind: iPakaianJadi!,jt: jtITManager!,    city: cPurwakarta!, dept: "IT",  jabatan: "IT Manager",               jenisLayanan: "Industri Pakaian Jadi",    companyEmail: "farhan.m@seyang.co.id",       phone: "081211110022", type: "participant", status: "checked_in" },
    { fullName: "Gita Rahayu",        coIdx: 0,  ind: iPakaianJadi!,jt: jtHRGAStaff!,   city: cPurwakarta!, dept: "HR",  jabatan: "HR / GA Staff",            jenisLayanan: "Industri Pakaian Jadi",    companyEmail: "gita.r@seyang.co.id",         phone: "081211110023", type: "participant", status: "checked_in" },
    // --- PT Indo-Rama (additional) ---
    { fullName: "Hendra Kurniawan",   coIdx: 7,  ind: iTekstil!,    jt: jtKepDiv!,       city: cPurwakarta!, dept: "HR",  jabatan: "Kepala Divisi",            jenisLayanan: "Tekstil",                  companyEmail: "hendra.k@indorama.co.id",     phone: "081211110024", type: "participant", status: "checked_in" },
    { fullName: "Indah Permatasari",  coIdx: 7,  ind: iTekstil!,    jt: jtAsstManager!,  city: cPurwakarta!, dept: "HR",  jabatan: "Assistant Manager",        jenisLayanan: "Tekstil",                  companyEmail: "indah.p@indorama.co.id",      phone: "081211110025", type: "participant", status: "checked_in" },
    // --- PT Adient (additional) ---
    { fullName: "Joko Susilo",        coIdx: 2,  ind: iOtomotif!,   jt: jtHRManager!,    city: cKarawang!,   dept: "HR",  jabatan: "HR Manager",               jenisLayanan: "Otomotif",                 companyEmail: "joko.s@adient.co.id",         phone: "081211110026", type: "participant", status: "checked_in" },
    { fullName: "Kartika Sari",       coIdx: 2,  ind: iOtomotif!,   jt: jtSupervisor!,   city: cKarawang!,   dept: "HR",  jabatan: "Supervisor",               jenisLayanan: "Otomotif",                 companyEmail: "kartika.s@adient.co.id",      phone: "081211110027", type: "participant", status: "checked_in" },
    // --- PT Dong Yang (additional) ---
    { fullName: "Lukman Hakim",       coIdx: 3,  ind: iManufaktur!, jt: jtHRGAManager!,  city: cPurwakarta!, dept: "HR",  jabatan: "HRGA Manager",             jenisLayanan: "Manufaktur",               companyEmail: "lukman.h@dongyang.co.id",     phone: "081211110028", type: "participant", status: "approved"   },
    // --- PT SANWA (additional) ---
    { fullName: "Mira Agustina",      coIdx: 4,  ind: iElektronik!, jt: jtHRGAStaff!,   city: cPurwakarta!, dept: "HR",  jabatan: "HR / GA Staff",            jenisLayanan: "Komponen Elektronik",      companyEmail: "mira.a@sanwa.co.id",          phone: "081211110029", type: "participant", status: "checked_in" },
    { fullName: "Nanang Setiawan",    coIdx: 4,  ind: iElektronik!, jt: jtITStaff!,      city: cPurwakarta!, dept: "IT",  jabatan: "IT Staff",                 jenisLayanan: "Komponen Elektronik",      companyEmail: "nanang.s@sanwa.co.id",        phone: "081211110030", type: "participant", status: "checked_in" },
    // --- PT Hitachi (additional) ---
    { fullName: "Oki Firmansyah",     coIdx: 11, ind: iManufaktur!, jt: jtManager!,      city: cPurwakarta!, dept: "HR",  jabatan: "Manager",                  jenisLayanan: "Manufaktur",               companyEmail: "oki.f@hitachi-cm.co.id",      phone: "081211110031", type: "participant", status: "rejected"   },
    { fullName: "Putri Handayani",    coIdx: 11, ind: iManufaktur!, jt: jtHRManager!,    city: cPurwakarta!, dept: "HR",  jabatan: "HR Manager",               jenisLayanan: "Manufaktur",               companyEmail: "putri.h@hitachi-cm.co.id",    phone: "081211110032", type: "participant", status: "checked_in" },
    // --- PT PK Manufacturing (additional) ---
    { fullName: "Qori Amalia",        coIdx: 5,  ind: iManufaktur!, jt: jtHRBPManager!,  city: cPurwakarta!, dept: "HR",  jabatan: "HRBP Manager",             jenisLayanan: "Manufaktur",               companyEmail: "qori.a@pkmanufacturing.co.id",phone:"081211110033", type: "participant", status: "checked_in" },
    { fullName: "Rizky Aditya",       coIdx: 5,  ind: iManufaktur!, jt: jtITManager!,    city: cPurwakarta!, dept: "IT",  jabatan: "IT Manager",               jenisLayanan: "Manufaktur",               companyEmail: "rizky.a@pkmanufacturing.co.id",phone:"081211110034", type: "participant", status: "checked_in" },
    // --- PT Japfa (additional) ---
    { fullName: "Sari Dewi Utami",    coIdx: 6,  ind: iAgribisnis!, jt: jtAsstManager!,  city: cSubang!,     dept: "HR",  jabatan: "Assistant Manager",        jenisLayanan: "Manufaktur",               companyEmail: "sari.du@japfa.co.id",         phone: "081211110035", type: "participant", status: "approved"   },
    // --- PT SH Garment (additional) ---
    { fullName: "Teguh Prasetya",     coIdx: 8,  ind: iTekstil!,    jt: jtSupervisor!,   city: cPurwakarta!, dept: "HR",  jabatan: "Supervisor",               jenisLayanan: "Tekstil",                  companyEmail: "teguh.p@shgarment.co.id",     phone: "081211110036", type: "participant", status: "checked_in" },
    { fullName: "Ulfah Nurdiana",     coIdx: 8,  ind: iTekstil!,    jt: jtHRGAStaff!,   city: cPurwakarta!, dept: "HR",  jabatan: "HR / GA Staff",            jenisLayanan: "Tekstil",                  companyEmail: "ulfah.n@shgarment.co.id",     phone: "081211110037", type: "participant", status: "checked_in" },
    // --- PT Multi Warna (additional) ---
    { fullName: "Vicky Ramadhan",     coIdx: 9,  ind: iTekstil!,    jt: jtManager!,      city: cPurwakarta!, dept: "HR",  jabatan: "Manager",                  jenisLayanan: "Tekstil",                  companyEmail: "vicky.r@multiwarna.co.id",    phone: "081211110038", type: "participant", status: "checked_in" },
    // --- PT INDONESIA SIMON (additional) ---
    { fullName: "Wahyu Triono",       coIdx: 10, ind: iAlasKaki!,   jt: jtHRGAManager!,  city: cPurwakarta!, dept: "HR",  jabatan: "HRGA Manager",             jenisLayanan: "Alas Kaki",                companyEmail: "wahyu.t@indonesiasimon.co.id",phone:"081211110039", type: "participant", status: "checked_in" },
    { fullName: "Xenia Pratiwi",      coIdx: 10, ind: iAlasKaki!,   jt: jtAsstManager!,  city: cPurwakarta!, dept: "HR",  jabatan: "Assistant Manager",        jenisLayanan: "Alas Kaki",                companyEmail: "xenia.p@indonesiasimon.co.id",phone:"081211110040", type: "participant", status: "checked_in" },
    // --- PT FURUKAWA (additional) ---
    { fullName: "Yoga Pratama",       coIdx: 12, ind: iAkumulator!, jt: jtSupervisor!,   city: cPurwakarta!, dept: "HR",  jabatan: "Supervisor",               jenisLayanan: "Akumulator Listrik",       companyEmail: "yoga.p@furukawa-im.co.id",    phone: "081211110041", type: "participant", status: "checked_in" },
    // --- PT Malindo (additional) ---
    { fullName: "Zahra Fitria",       coIdx: 13, ind: iAgribisnis!, jt: jtHRGAStaff!,   city: cSubang!,     dept: "HR",  jabatan: "HR / GA Staff",            jenisLayanan: "Manufaktur",               companyEmail: "zahra.f@malindo.co.id",       phone: "081211110042", type: "participant", status: "pending"    },
    // --- PT Besland (additional) ---
    { fullName: "Arief Budiman",      coIdx: 14, ind: iManufaktur!, jt: jtHRManager!,    city: cPurwakarta!, dept: "HR",  jabatan: "HR Manager",               jenisLayanan: "Manufaktur",               companyEmail: "arief.b@besland.co.id",       phone: "081211110043", type: "participant", status: "checked_in" },
    { fullName: "Bella Susanti",      coIdx: 14, ind: iManufaktur!, jt: jtKepDiv!,       city: cPurwakarta!, dept: "IT",  jabatan: "Kepala Divisi IT",         jenisLayanan: "Manufaktur",               companyEmail: "bella.s@besland.co.id",       phone: "081211110044", type: "participant", status: "approved"   },
    // --- PT Astra Honda (additional) ---
    { fullName: "Chandra Wibowo",     coIdx: 16, ind: iOtomotif!,   jt: jtManager!,      city: cBekasi!,     dept: "HR",  jabatan: "Manager",                  jenisLayanan: "Otomotif",                 companyEmail: "chandra.w@ahm.co.id",         phone: "081211110045", type: "participant", status: "checked_in" },
    { fullName: "Dian Rahmawati",     coIdx: 16, ind: iOtomotif!,   jt: jtHRBPManager!,  city: cBekasi!,     dept: "HR",  jabatan: "HRBP Manager",             jenisLayanan: "Otomotif",                 companyEmail: "dian.r@ahm.co.id",            phone: "081211110046", type: "participant", status: "approved"   },
    // --- PT Len Industri (additional) ---
    { fullName: "Erwin Saputra",      coIdx: 17, ind: iElektronik!, jt: jtITManager!,    city: cBandung!,    dept: "IT",  jabatan: "IT Manager",               jenisLayanan: "Komponen Elektronik",      companyEmail: "erwin.s@len.co.id",           phone: "081211110047", type: "participant", status: "pending"    },
    { fullName: "Fitri Handayani",    coIdx: 17, ind: iElektronik!, jt: jtHRGAStaff!,   city: cBandung!,    dept: "HR",  jabatan: "HR / GA Staff",            jenisLayanan: "Komponen Elektronik",      companyEmail: "fitri.h@len.co.id",           phone: "081211110048", type: "participant", status: "pending"    },
    // --- PT Yamaha (additional) ---
    { fullName: "Galih Pramono",      coIdx: 15, ind: iOtomotif!,   jt: jtHRManager!,    city: cKarawang!,   dept: "HR",  jabatan: "HR Manager",               jenisLayanan: "Otomotif",                 companyEmail: "galih.p@yamaha-parts.co.id",  phone: "081211110049", type: "participant", status: "checked_in" },
    // --- PT Purnama Asih Sur (additional) ---
    { fullName: "Hani Saraswati",     coIdx: 1,  ind: iManufaktur!, jt: jtAsstManager!,  city: cPurwakarta!, dept: "HR",  jabatan: "Assistant Manager",        jenisLayanan: "Manufaktur",               companyEmail: "hani.s@purnama.co.id",        phone: "081211110050", type: "participant", status: "checked_in" },
    { fullName: "Imam Santoso",       coIdx: 1,  ind: iManufaktur!, jt: jtHRGAManager!,  city: cPurwakarta!, dept: "HR",  jabatan: "HRGA Manager",             jenisLayanan: "Manufaktur",               companyEmail: "imam.s@purnama.co.id",        phone: "081211110051", type: "participant", status: "checked_in" },
    { fullName: "Julia Wulandari",    coIdx: 1,  ind: iManufaktur!, jt: jtSupervisor!,   city: cPurwakarta!, dept: "IT",  jabatan: "Supervisor IT",            jenisLayanan: "Manufaktur",               companyEmail: "julia.w@purnama.co.id",       phone: "081211110052", type: "participant", status: "approved"   },
    // --- PT Seyang (exhibitor) ---
    { fullName: "Kevin Hartanto",     coIdx: 0,  ind: iPakaianJadi!,jt: jtManager!,      city: cJakarta!,    dept: "Other",jabatan: "Business Development",    jenisLayanan: "Industri Pakaian Jadi",    companyEmail: "kevin.h@seyang.co.id",        phone: "081211110053", type: "exhibitor",   status: "approved"   },
    { fullName: "Lena Agustin",       coIdx: 2,  ind: iOtomotif!,   jt: jtManager!,      city: cJakarta!,    dept: "Other",jabatan: "Account Manager",         jenisLayanan: "Otomotif",                 companyEmail: "lena.a@adient.co.id",         phone: "081211110054", type: "exhibitor",   status: "approved"   },
    { fullName: "Mario Effendi",      coIdx: 12, ind: iAkumulator!, jt: jtSupervisor!,   city: cJakarta!,    dept: "Other",jabatan: "Sales Supervisor",        jenisLayanan: "Akumulator Listrik",       companyEmail: "mario.e@furukawa-im.co.id",   phone: "081211110055", type: "exhibitor",   status: "checked_in" },
  ];

  const participantDocs = await Participant.insertMany(
    pRaw.map(p => ({
      fullName: p.fullName,
      normalizedFullName: p.fullName.toLowerCase(),
      personalEmail: null,
      companyEmail: p.companyEmail,
      phone: p.phone,
      company: {
        companyId: co(p.coIdx)._id,
        name: co(p.coIdx).name,
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
      sourceChannel: { code: "Email", otherText: null },
      identityFingerprint: null,
      notes: null,
      isActive: true,
    }))
  );
  console.log(`[SEED] Participants: ${participantDocs.length}`);

  // -------------------------------------------------------------------------
  // 8. Registrations (one per participant)
  // -------------------------------------------------------------------------

  // Frozen snapshot of the form fields (no placeholder/helpText/validation)
  const snapshotFields = formFields.map(f => ({
    fieldId: f.fieldId,
    key: f.key,
    label: f.label,
    type: f.type,
    order: f.order,
    isFixed: f.isFixed,
    ...("options" in f && f.options ? { options: f.options } : {}),
  }));

  const registrations = participantDocs.map((participant, i) => {
    const raw = pRaw[i]!;
    const isApproved =
      raw.status === "approved" || raw.status === "checked_in";
    const isCheckedIn = raw.status === "checked_in";
    const isRejected  = raw.status === "rejected";

    const approvedAt = isApproved
      ? new Date("2025-10-01T10:00:00Z")
      : null;

    const qrCode = isApproved ? `QR-${uid()}` : null;

    return {
      eventId:       eventDoc._id,
      participantId: participant._id,
      participantType: raw.type,
      status: raw.status,

      approval: {
        approvedBy:      isApproved  ? admin1!._id : null,
        approvedAt,
        rejectedBy:      isRejected  ? admin2!._id : null,
        rejectedAt:      isRejected  ? new Date("2025-10-02T09:00:00Z") : null,
        rejectionReason: isRejected  ? "Kuota departemen sudah terpenuhi." : null,
      },

      formSnapshot: {
        version: 1,
        fields:  snapshotFields,
      },

      answers: [
        { fieldId: fIdName,    key: "full_name",      label: "Nama Lengkap",    type: "text",  value: raw.fullName },
        { fieldId: fIdPhone,   key: "phone",          label: "No Handphone",    type: "phone", value: raw.phone ?? "" },
        { fieldId: fIdCompEmail,key:"company_email",  label: "Email Perusahaan",type: "email", value: raw.companyEmail ?? "" },
        { fieldId: fIdPersEmail,key:"personal_email", label: "Email Pribadi",   type: "email", value: "" },
        { fieldId: fIdDept,    key: "department",     label: "Departemen",      type: "radio", value: raw.dept },
        { fieldId: fIdJabatan, key: "jabatan",        label: "Jabatan",         type: "text",  value: raw.jabatan },
        { fieldId: fIdJenisLay,key: "jenis_layanan",  label: "Jenis Layanan",   type: "text",  value: raw.jenisLayanan },
        { fieldId: fIdAsal,    key: "asal_kota",      label: "Asal Kota",       type: "text",  value: raw.city.name },
      ],

      companySnapshot: {
        companyId: co(raw.coIdx)._id,
        name: co(raw.coIdx).name,
      },
      industrySnapshot: {
        refId: raw.ind._id,
        name:  raw.ind.name,
      },
      jobTitleSnapshot: {
        refId: raw.jt._id,
        name:  raw.jt.name,
      },
      citySnapshot: {
        refId: raw.city._id,
        name:  raw.city.name,
      },

      ticket: qrCode
        ? {
            qrCode,
            issuedAt:     approvedAt,
            reissueCount: 0,
            isActive:     true,
          }
        : null,

      checkIn: {
        isAttended:  isCheckedIn,
        checkedInAt: isCheckedIn ? eventDoc.eventDate : null,
        checkedInBy: isCheckedIn ? admin1!._id : null,
        scanMethod:  "qr",
        notes:       null,
      },
    };
  });

  await Registration.insertMany(registrations);
  console.log(`[SEED] Registrations: ${registrations.length}`);

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------
  console.log("\n[SEED] Complete.\n");
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(err => {
  console.error("[SEED] Fatal error:", err);
  process.exit(1);
});
