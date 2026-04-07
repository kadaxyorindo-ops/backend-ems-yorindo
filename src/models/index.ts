/**
 * @file index.ts
 * @description Single public entry point for all Mongoose models.
 *
 * Rules:
 *  - The rest of the application (controllers, services, routes) imports
 *    models ONLY from this file — never directly from individual schema files.
 *  - If a model file is renamed or moved, update only this file.
 *    No other part of the codebase should need to change.
 *
 * Import order:
 *  1. Master data (no dependencies on other models)
 *  2. Internal users & auth
 *  3. Core domain (participant, event, registration)
 *  4. Surveys
 *  5. Audit
 *
 * Usage in controllers/services:
 *   import { User, Event, Registration } from "../models";
 */

// --- Master data ---
export { Industry } from "./schemas/industry.schema.js";
export { JobTitle } from "./schemas/job-title.schema.js";
export { City } from "./schemas/city.schema.js";
export { Company } from "./schemas/company.schema.js";

// --- Internal users & auth ---
export { User } from "./schemas/user.schema.js";
export { Otp } from "./schemas/otp.schema.js";

// --- Core domain ---
export { Participant } from "./schemas/participant.schema.js";
export { Event } from "./schemas/event.schema.js";
export { Registration } from "./schemas/registration.schema.js";

// --- Surveys ---
export { Survey } from "./schemas/survey.schema.js";
export { SurveyResponse } from "./schemas/survey-response.schema.js";

// --- Audit ---
export { AuditLog } from "./schemas/audit-log.schema.js";

// --- Communication ---
export { CommunicationCampaign } from "./schemas/communication-campaign.schema.js";
