import type { Request, Response } from 'express';
import City from '../models/City.ts';
import Company from '../models/Company.ts';
import Industry from '../models/Industry.ts';
import JobTitle from '../models/JobTitle.ts';
import Participant from '../models/Participant.ts';
import SurveyResponse from '../models/SurveyResponse.ts';
import { Event, Registration } from "../models/index.ts";

interface SurveyAnswerInput {
  questionId: string;
  label: string;
  type: string;
  value: unknown;
}

function buildQuestionId(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug ? `q_${slug}` : `q_${index + 1}`;
}

function normalizeSurveyAnswers(input: unknown): SurveyAnswerInput[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input as SurveyAnswerInput[];
  }

  if (typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).map(
      ([label, value], index) => {
        let type = "text";

        if (Array.isArray(value)) type = "checkbox";
        else if (typeof value === "number") type = "number";

        return {
          questionId: buildQuestionId(label, index),
          label,
          type,
          value,
        };
      },
    );
  }

  return [];
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


    const event = await Event.findById(event_id).select("registrationForm").lean();
    if (!event) {
      return res.status(404).json({ success: false, message: "Event tidak ditemukan" });
    }

    const form = event.registrationForm;
    const fields = form?.fields ?? [];
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "Form registrasi belum tersedia" });
    }

    const fixedValues: Record<string, unknown> = {
      full_name: nama_lengkap,
      company_name: nama_company,
      company_location: lokasi_perusahaan,
      industry: jenis_industri,
      job_title: jabatan,
      company_email: email_perusahaan,
      personal_email: email_pribadi,
      phone: no_hp,
    };

    const answers = fields.reduce((acc, field) => {
      if (!field.isFixed) return acc;
      const value = fixedValues[field.key];

      if (value !== undefined && value !== null && value !== "") {
        acc.push({
          fieldId: field.fieldId,
          key: field.key,
          label: field.label,
          type: field.type,
          value,
        });
      }

      return acc;
    }, [] as Array<{ fieldId: string; key: string; label: string; type: string; value: unknown }>);

    const existingRegistration = await Registration.findOne({
      eventId: event_id,
      participantId: participant._id,
    }).lean();

    if (existingRegistration) {
      return res.status(409).json({ success: false, message: "Peserta sudah terdaftar di event ini" });
    }

    const registration = await Registration.create({
      eventId: event_id,
      participantId: participant._id,
      participantType: "participant",
      approval: {
        approvedBy: null,
        approvedAt: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectionReason: null,
      },
      formSnapshot: {
        version: form?.version ?? 1,
        fields: fields.map((field) => ({
          fieldId: field.fieldId,
          key: field.key,
          label: field.label,
          type: field.type,
          order: field.order,
          isFixed: field.isFixed,
          options: field.options,
        })),
      },
      answers,
      companySnapshot: { companyId: company._id, name: company.name },
      industrySnapshot: { refId: industry._id, name: industry.name },
      jobTitleSnapshot: { refId: jobTitle._id, name: jobTitle.name },
      citySnapshot: { refId: city._id, name: city.name },
    });

    const customAnswers = normalizeSurveyAnswers(survei_result);
    if (customAnswers.length > 0) {
      const existingSurvey = await SurveyResponse.findOne({
        eventId: event_id,
        participantId: participant._id,
      });

      if (!existingSurvey) {
        const survey = new SurveyResponse({
          eventId: event_id,
          surveyId: null,
          participantId: participant._id,
          answers: customAnswers,
        });
        await survey.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: "Proses Registrasi Berhasil Disimpan ke Semua Database!",
      data: {
        participant_id: participant._id,
        registration_id: registration._id,
      }
    });

  } catch (error: any) {
    console.error("Error Registrasi:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: error.message });
  }
};
