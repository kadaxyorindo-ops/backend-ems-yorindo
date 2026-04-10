import type { Request, Response } from "express";
import mongoose from "mongoose";
import SurveyResponse from "../models/SurveyResponse.ts";
import { Event } from "../models/index.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";
import type { AnalyticsEventParams } from "../validators/analytic.validators.ts";

export const getEventSurveyAnalytics = async (req: Request, res: Response): Promise<any> => {
  try {
    const eventId =
      (res.locals.parsed?.params as AnalyticsEventParams | undefined)?.eventId ??
      ((req.params.eventId || req.params.id) as string);

    // Validasi Event
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return sendError(res, 404, "Event tidak ditemukan");
    }

    // MONGODB AGGREGATION PIPELINE
    const rawAnalytics = await SurveyResponse.aggregate([
      // Ambil data survey khusus untuk event ini
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },

      // SMART LOGIC
      {
        $project: {
          answersArray: {
            $switch: {
              branches: [
                // KONDISI 1: Jika datanya Object
                {
                  case: { $eq: [{ $type: "$answers" }, "object"] },
                  then: { $objectToArray: "$answers" }
                },
                // KONDISI 2: Jika datanya Array
                {
                  case: { $eq: [{ $type: "$answers" }, "array"] },
                  then: {
                    $map: {
                      input: "$answers",
                      as: "ans",
                      in: {
                        k: { $ifNull: ["$$ans.label", { $ifNull: ["$$ans.questionId", "Pertanyaan Tanpa Judul"] }] },
                        v: "$$ans.value"
                      }
                    }
                  }
                }
              ],
              default: []
            }
          }
        }
      },

      { $unwind: { path: "$answersArray", preserveNullAndEmptyArrays: false } },

      // Pastikan data memiliki Key dan Value yang valid
      { $match: { "answersArray.k": { $ne: null }, "answersArray.v": { $ne: null } } },

      // Handle Checkbox
      {
        $project: {
          question: "$answersArray.k",
          answerValues: {
            $cond: {
              if: { $eq: [{ $type: "$answersArray.v" }, "array"] },
              then: "$answersArray.v",        
              else: ["$answersArray.v"]      
            }
          }
        }
      },

      // Pecah lagi array jawabannya agar bisa dihitung per item
      { $unwind: "$answerValues" },

      // GROUPING 1: Hitung masing-masing jawaban
      {
        $group: {
          _id: { question: "$question", answer: "$answerValues" },
          count: { $sum: 1 }
        }
      },

      // GROUPING 2: Satukan kembali berdasarkan pertanyaannya
      {
        $group: {
          _id: "$_id.question",
          data: {
            $push: {
              label: "$_id.answer",
              total: "$count"
            }
          }
        }
      }
    ]);

    // LOGIC FORMATTING FRONTEND
    const result: Record<string, any> = {};

    rawAnalytics.forEach((item) => {
      const questionKey = item._id;
      const responses = item.data;

      const totalUniqueAnswers = responses.length;
      const totalVotes = responses.reduce((acc: number, curr: any) => acc + curr.total, 0);
      const avgFrequency = totalVotes / totalUniqueAnswers;

      // Asumsi jika jawaban sangat bervariasi, berarti itu isian teks panjang/pendek
      const isTextBased = totalUniqueAnswers >= 7 && avgFrequency <= 1.5;

      if (isTextBased) {
        result[questionKey] = {
          type: "text_list",
          data: responses.map((r: any) => r.label)
        };
      } else {
        const chartData: Record<string, number> = {};
        responses.forEach((r: any) => {
          chartData[String(r.label)] = r.total;
        });

        result[questionKey] = {
          type: "chart",
          data: chartData
        };
      }
    });

    return sendSuccess(res, 200, "Data analitik berhasil di-generate", {
      eventId,
      totalDataAnalyzed: rawAnalytics.length,
      analytics: result,
    });

  } catch (error: any) {
    console.error("Error Analytics:", error);
    return sendError(res, 500, "Terjadi kesalahan server", error?.message);
  }
};
