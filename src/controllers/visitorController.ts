import type { Request, Response } from 'express';
import City from '../models/City.ts';
import Company from '../models/Company.ts';
import Industry from '../models/Industry.ts';
import JobTitle from '../models/JobTitle.ts';
import Participant from '../models/Participant.ts';
import Registration from '../models/Registration.ts';
import SurveyResponse from '../models/SurveyResponse.ts';
import { Event } from "../models/index.ts";

interface CustomAnswerInput {
  questionId?: string;
  label: string;
  type?: string;
  value: unknown;
}

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function buildCustomValueMap(input: unknown): Map<string, unknown> {
  const map = new Map<string, unknown>();
  if (!input) return map;

  if (Array.isArray(input)) {
    for (const item of input as CustomAnswerInput[]) {
      if (item?.label) {
        map.set(normalizeKey(item.label), item.value);
      }
    }
    return map;
  }

  if (typeof input === "object") {
    for (const [label, value] of Object.entries(input as Record<string, unknown>)) {
      map.set(normalizeKey(label), value);
    }
  }

  return map;
}

export const submitRegistration = async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      event_id,
      nama_lengkap,
      email_pribadi,
      email_perusahaan,
      no_hp,
      nama_company,
      lokasi_perusahaan,
      jenis_industri,
      jabatan,
      survei_result
    } = req.body;

    // validasi event di awal
    const event = await Event.findById(event_id).lean();
    if (!event) {
      return res.status(404).json({ success: false, message: "Event tidak ditemukan" });
    }

    console.log("MULAI CEK DUPLIKAT");

    const queryKondisi = [];
    if (email_perusahaan) queryKondisi.push({ companyEmail: email_perusahaan });
    if (email_pribadi) queryKondisi.push({ personalEmail: email_pribadi });
    if (no_hp) queryKondisi.push({ phone: no_hp });

    if (queryKondisi.length > 0) {
      const existingParticipants = await Participant.find({ $or: queryKondisi });
      console.log(`1. Ditemukan ${existingParticipants.length} data participant dengan kontak yang sama di DB`);

      for (const p of existingParticipants) {
        // Cek registrasi pakai logika
        const isAlreadyRegistered = await Registration.findOne({
          eventId: event_id,
          $or: [
            { participantId: p._id },
            { participantId: String(p._id) }
          ]
        });

        if (isAlreadyRegistered) {
          console.log("BLOKIR AKTIF: Data registrasi duplikat ditemukan!");
          return res.status(409).json({ 
            success: false, 
            message: "Email atau nomor HP Anda sudah terdaftar untuk event ini." 
          });
        }
      }
    }
    
    console.log("AMAN: Tidak ada duplikat, lanjut simpan data baru...");

    // lanjut proses simpan data jika aman
    const city = await City.findOneAndUpdate(
      { name: lokasi_perusahaan }, 
      { name: lokasi_perusahaan, normalizedName: lokasi_perusahaan.toLowerCase() }, 
      { new: true, upsert: true }
    );

    const company = await Company.findOneAndUpdate(
      { name: nama_company }, 
      { name: nama_company, normalizedName: nama_company.toLowerCase() }, 
      { new: true, upsert: true }
    );

    const industry = await Industry.findOneAndUpdate(
      { name: jenis_industri }, 
      { name: jenis_industri, normalizedName: jenis_industri.toLowerCase() }, 
      { new: true, upsert: true }
    );

    const jobTitle = await JobTitle.findOneAndUpdate(
      { name: jabatan }, 
      { name: jabatan, normalizedName: jabatan.toLowerCase() },
      { new: true, upsert: true }
    );

    const participant = await Participant.findOneAndUpdate(
      { companyEmail: email_perusahaan }, 
      {
        fullName: nama_lengkap,
        normalizedFullName: nama_lengkap.toLowerCase(),
        personalEmail: email_pribadi,
        companyEmail: email_perusahaan,
        phone: no_hp,
        company: { companyId: company._id, name: company.name },
        industry: { refId: industry._id, name: industry.name },
        jobTitle: { refId: jobTitle._id, name: jobTitle.name },
        city: { refId: city._id, name: city.name }
      },
      { new: true, upsert: true }
    );

    const registration = await Registration.findOneAndUpdate(
      { eventId: event_id, participantId: participant._id },
      { 
        eventId: event_id, 
        participantId: participant._id, 
        status: 'pending' 
      },
      { new: true, upsert: true }
    );

    // simpan hasil survei
    const answersMap = buildCustomValueMap(survei_result);

    if (answersMap.size > 0) {
      const existingSurvey = await SurveyResponse.findOne({
        eventId: event_id,
        participantId: participant._id,
      });

      if (!existingSurvey) {
        const survey = new SurveyResponse({
          eventId: event_id,
          surveyId: event.surveyId || null, 
          participantId: participant._id,
          registrationId: registration._id,
          answers: Object.fromEntries(answersMap)
        });
        
        await survey.save();
      }
    }

    console.log("SUKSES: Data baru berhasil disimpan!");
    return res.status(201).json({
      success: true,
      message: "Proses registrasi berhasil disimpan ke database!",
      data: {
        participant_id: participant._id,
        registration_id: registration._id 
      }
    });

  } catch (error: any) {
    console.error("Error registrasi:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: error.message });
  }
};