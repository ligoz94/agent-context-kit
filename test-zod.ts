import { z } from "zod";
export const m = z.object({
  a: z.object({
    b: z.string()
  }).optional()
});
export const schema = m.extend({
  profiles: z.record(z.string(), m).optional()
});
console.log(schema.parse({ profiles: { test: { a: undefined } } }));
