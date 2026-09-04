// Zod schemas
import { z } from 'zod'
import * as m from '@/paraglide/messages'

export const getValidationSchemas = () => ({
  stringMax500: z
    .string()
    .trim()
    .max(500, m.field_max_length({ max: 500 })),
  stringMax100: z
    .string()
    .trim()
    .max(100, m.field_max_length({ max: 100 })),
  stringMax30: z
    .string()
    .trim()
    .max(30, m.field_max_length({ max: 30 })),
  stringMax5: z
    .string()
    .trim()
    .max(5, m.field_max_length({ max: 5 })),
  stringMax10: z
    .string()
    .trim()
    .max(10, m.field_max_length({ max: 10 })),
  stringMax16: z
    .string()
    .trim()
    .max(16, m.field_max_length({ max: 16 })),
  stringRequiredMax50: z
    .string()
    .trim()
    .min(1, m.field_required_short())
    .max(50, m.field_max_length({ max: 50 })),
  stringRequiredMax100: z
    .string()
    .trim()
    .min(1, m.field_required_short())
    .max(100, m.field_max_length({ max: 100 })),
  stringRequiredMax5: z
    .string()
    .trim()
    .min(1, m.field_required_short())
    .max(5, m.field_max_length({ max: 5 })),
  stringRequiredMax10: z
    .string()
    .trim()
    .min(1, m.field_required_short())
    .max(10, m.field_max_length({ max: 10 })),
  stringRequiredMax16: z
    .string()
    .trim()
    .min(1, m.field_required_short())
    .max(16, m.field_max_length({ max: 16 })),
  stringRequired: z.string().trim().min(1, m.field_required_short()),
  integer: z.number().int({ message: m.field_integer() }),
  integerMin0Max100: z
    .number()
    .int({ message: m.field_integer() })
    .min(0, m.field_min_value({ min: 0 }))
    .max(100, m.field_max_value({ max: 100 })),
  integerMin0Max200: z
    .number()
    .int({ message: m.field_integer() })
    .min(0, m.field_min_value({ min: 0 }))
    .max(200, m.field_max_value({ max: 200 })),
  // ---
  reference: z
    .string()
    .trim()
    .min(1, m.field_required_short())
    .max(10, m.field_max_length({ max: 10 }))
    .regex(/^[^\s/\\]+$/, m.field_no_whitespace_or_slash()),
  name: z
    .string()
    .trim()
    .min(1, m.field_required_short())
    .max(100, m.field_max_length({ max: 100 })),
  email: z.email(),
  emailOptional: z.union([z.literal(''), z.email()]),
  phone: z
    .string()
    .trim()
    .min(4, m.field_required_short())
    .max(20, m.field_max_length({ max: 20 })),
  phoneOptional: z
    .string()
    .trim()
    .max(20, m.field_max_length({ max: 20 })),
  password: z
    .string()
    .trim()
    .min(8, m.field_min_length({ min: 8 }))
    .max(64, m.field_max_length({ max: 64 }))
    .regex(/[a-z]/, m.field_password_regex_min_one_lowercase())
    .regex(/[A-Z]/, m.field_password_regex_min_one_uppercase())
    .regex(/[0-9]/, m.field_password_regex_min_one_number())
    .regex(/[-_*!@#$%]/, m.field_password_regex_min_one_special_character()),
  ssid: z
    .string()
    .trim()
    .min(1, m.field_required_short())
    .max(32, m.field_max_length({ max: 32 })),
  prefix: z
    .string()
    .max(4, m.prefix_max_length())
    .regex(/^[0-9A-Z]*$/, m.field_alphanumeric_only()),
  prefixRequired: z
    .string()
    .min(1, m.field_required_short())
    .max(4, m.prefix_max_length())
    .regex(/^[0-9A-Z]*$/, m.field_alphanumeric_only())
})
