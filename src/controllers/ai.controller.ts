import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import SurveyResponse from '../models/SurveyResponse.ts';
import { Event } from '../models/index.ts';

export const generateEventAIInsight = async (req: Request, res: Response): Promise<any> => {
  try {
    const eventId = (req.params.eventId || req.params.id) as string;

    // 1. Validasi Event
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({ success: false, message: "Event tidak ditemukan" });
    }

    // 2. Ambil Data Survey Mentah (AI LLM sangat pintar membaca JSON mentah)
    const rawResponses = await SurveyResponse.find({ eventId: new mongoose.Types.ObjectId(eventId) }).lean();
    
    if (!rawResponses || rawResponses.length === 0) {
        return res.status(400).json({ success: false, message: "Belum ada data survey untuk dianalisis oleh AI." });
    }

    // Kita bersihkan datanya sedikit biar token AI tidak terlalu boros
    const cleanDataForAI = rawResponses.map(res => res.answers);

    // Prompt
    const prompt = `
    Bertindaklah sebagai Senior Data Scientist dan Konsultan Strategi Bisnis untuk Event B2B/B2C. 
    
    Tugas Anda adalah menganalisis data JSON hasil survey pengunjung untuk event "${event.title}".
    PENTING: Pertanyaan dalam survey ini sangat beragam (custom fields) karena dibuat langsung oleh pihak Exhibitor untuk memahami audiens mereka.
    
    Berikut adalah data mentahnya:
    ${JSON.stringify(cleanDataForAI)}

    Instruksi Analisis:
    1. Abaikan format struktur JSON, fokuslah pada MAKNA dari "pertanyaan" (keys) dan "jawaban" (values).
    2. Temukan pola mayoritas dan minoritas dari jawaban audiens.
    3. Cari korelasi tersembunyi (misal: jika ada pertanyaan tentang 'Budget' dan 'Kebutuhan', hubungkan keduanya).
    4. Temukan "Hidden Opportunity" (Peluang tersembunyi) yang mungkin tidak disadari oleh Exhibitor dari data tersebut.

    Berdasarkan analisis mendalam tersebut, buatkan laporan "Ultimate Event Insight" menggunakan format Markdown berikut:

    ### Executive Summary
    (Tulis 2-3 kalimat tajam yang merangkum temuan paling mengejutkan/penting dari data ini. Jangan gunakan kata-kata klise, langsung pada fakta angka dan dampaknya).

    ### Audience Persona & Intent
    (Berdasarkan jawaban mereka, tebak siapa sebenarnya mayoritas pengunjung ini? Apa Pain Point (masalah) utama mereka? Apa niat kedatangan mereka ke booth exhibitor?)

    ### Strategic Action Plan
    (Berikan 3 poin rekomendasi taktis yang SANGAT SPESIFIK untuk Exhibitor. Contoh yang BURUK: "Tingkatkan promosi". Contoh yang BAIK: "Berdasarkan tingginya minat pada fitur X namun budget mayoritas di bawah 10 juta, segera tawarkan paket Lite/Downsell di follow-up email".)

    ### Hidden Opportunities / Red Flags
    (Sebutkan 1 hal yang merupakan peluang emas tak terduga, ATAU 1 peringatan bahaya/red flag yang harus diantisipasi exhibitor berdasarkan keanehan/pola pada data jawaban).

    Gunakan bahasa Indonesia yang profesional, ringkas, dan berbobot (high-level business language). Jangan mengulang data mentah, tapi berikan MAKNA dari data tersebut.
    `;

    // 4. Tembak ke API KADA (Pastikan nama model dan URL sesuai KADA)
    const aiResponse = await axios.post(
      process.env.KADA_ENDPOINT || 'https://mlapi.run/daef5150-72ef-48ff-8861-df80052ea7ac/v1/chat/completions', 
      {
        model: 'null', 
        messages: [
          { role: 'system', content: 'You are a helpful business data analyst for event management.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.KADA_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiInsightText = aiResponse.data.choices[0].message.content;

    // 5. Kembalikan Hasilnya ke Frontend
    return res.status(200).json({
      success: true,
      message: "AI Insight berhasil di-generate",
      eventId: eventId,
      data: {
          insight: aiInsightText
      }
    });

  } catch (error: any) {
    console.error("Error Generating AI Insight:", error?.response?.data || error.message);
    return res.status(500).json({ 
        success: false, 
        message: "Gagal menghasilkan AI Insight", 
        error: error?.response?.data || error.message 
    });
  }
};