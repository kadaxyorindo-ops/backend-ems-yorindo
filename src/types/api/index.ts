/**
 * @file types/api/index.ts
 * @description Shared TypeScript types for all API responses.
 *
 * Every endpoint returns either ApiSuccessResponse or ApiErrorResponse.
 * Pagination is embedded inside ApiSuccessResponse when the data is a list.
 */

/** Metadata for paginated list responses. */
export interface Pagination {
    page: number;
    limit: number;
    total: number; // Total douments matching the filter
    totalPages: number;
}

/** Wrapper returned by list endpoints that support pagination. */
export interface PaginatedData<T> {
    items: T[];
    pagination: Pagination;
}

/** Shape of every successful response body */
export interface ApiSuccessResponse<T> {
    success: true;
    message: string;
    data: T;
}

/** Shape of every error response body */
export interface ApiErrorResponse {
    success: false;
    message: string;
    errors?: unknown; // Zod field errors, or any structured details
}