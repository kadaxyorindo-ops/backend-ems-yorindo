import type { Request, Response, NextFunction } from "express";
import {
  getFormBuilderByEvent,
  getFormBuilderByIndustry,
  getFormBuilderBySlug,
  upsertFormBuilder,
} from "../services/formBuilder.service";
import { sendError, sendSuccess } from "../utils/apiResponse";
import type {
  FormBuilderEventParams,
  FormBuilderIndustryParams,
  FormBuilderSlugParams,
  FormBuilderUpsertBody,
} from "../validators/formBuilder.validators";

export async function getFormBuilderHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as FormBuilderEventParams;

    const data = await getFormBuilderByEvent(eventId);
    if (!data) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "form builder fetched", data);
  } catch (error) {
    next(error);
  }
}

export async function upsertFormBuilderHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventId } = res.locals.parsed.params as FormBuilderEventParams;
    const payload = res.locals.parsed.body as FormBuilderUpsertBody;

    const payloadForService = {
      ...(payload.formName === undefined ? {} : { formName: payload.formName }),
      ...(payload.customQuestions === undefined
        ? {}
        : { customQuestions: payload.customQuestions }),
      ...(payload.publish === undefined ? {} : { publish: payload.publish }),
    } as const;

    const data = await upsertFormBuilder(eventId, payloadForService as any);
    if (!data) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "form builder saved", data);
  } catch (error) {
    next(error);
  }
}

export async function getFormBuilderBySlugHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { slug } = res.locals.parsed.params as FormBuilderSlugParams;

    const data = await getFormBuilderBySlug(slug);
    if (!data) {
      sendError(res, 404, "Event not found");
      return;
    }

    sendSuccess(res, 200, "form builder fetched", data);
  } catch (error) {
    next(error);
  }
}

export async function getFormBuilderByIndustryHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { industryId } = res.locals.parsed.params as FormBuilderIndustryParams;

    const data = await getFormBuilderByIndustry(industryId);
    if (!data) {
      sendError(res, 404, "Form for this industry not found");
      return;
    }

    sendSuccess(res, 200, "form builder fetched", data);
  } catch (error) {
    next(error);
  }
}
