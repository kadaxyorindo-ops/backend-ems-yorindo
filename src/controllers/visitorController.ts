import type { Request, Response } from 'express';
import City from '../models/City.ts';
import Company from '../models/Company.ts';
import Industry from '../models/Industry.ts';
import JobTitle from '../models/JobTitle.ts';
import Participant from '../models/Participant.ts';
import SurveyResponse from '../models/SurveyResponse.ts';

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


    if (survei_result && Object.keys(survei_result).length > 0) {
      const survey = new SurveyResponse({
        eventId: event_id,
        participantId: participant._id,
        answers: survei_result
      });
      await survey.save();
    }

    return res.status(201).json({
      success: true,
      message: "Proses Registrasi Berhasil Disimpan ke Semua Database!",
      data: {
        participant_id: participant._id,
      }
    });

  } catch (error: any) {
    console.error("Error Registrasi:", error);
    return res.status(500).json({ success: false, message: "Terjadi kesalahan server", error: error.message });
  }
};