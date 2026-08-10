import { z } from 'zod';

// Form inputs arrive as '' for "left blank" — treat that the same as absent
// instead of failing string/url/date validation on an empty string.
const blankToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

export const optionalText = z.preprocess(blankToNull, z.string().trim().nullable().optional());
export const optionalUrl = z.preprocess(blankToNull, z.string().trim().url().nullable().optional());
export const optionalDateTime = z.preprocess(blankToNull, z.coerce.date().nullable().optional());
export const requiredDateTime = z.coerce.date();
export const optionalPositiveInt = z.preprocess(blankToNull, z.number().int().positive().nullable().optional());
