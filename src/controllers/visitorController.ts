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
        status: 'pending',
        companySnapshot:  { companyId: company._id,  name: company.name },
        industrySnapshot: { refId: industry._id,     name: industry.name },
        jobTitleSnapshot: { refId: jobTitle._id,     name: jobTitle.name },
        citySnapshot:     { refId: city._id,         name: city.name },
      },
      { new: true, upsert: true }
    );

    const event = await Event.findById(event_id).lean();
    if (!event) {
      return res.status(404).json({ success: false, message: "Event tidak ditemukan" });
    }

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
        console.log("Survey Response berhasil disimpan ke MongoDB!");
      }
    }

    return res.status(201).json({
      success: true,
      message: "Proses Registrasi Berhasil Disimpan ke Semua Database!",
      data: {
        participant_id: participant._id,
        registration_id: registration._id 
      }
    });

  } catch (error: any) {
    console.error("Error Registrasi:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: error.message });
  }
};