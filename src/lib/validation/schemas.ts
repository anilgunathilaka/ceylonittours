import { z } from "zod";

export const tourSearchSchema = z.object({
  destination: z.string().min(1, "Choose a destination"),
  tourType: z.string().min(1, "Choose a tour type"),
  travellers: z.coerce.number().int().min(1, "At least 1 traveller").max(20, "Max 20 travellers"),
  date: z.string().min(1, "Pick a date"),
});

export type TourSearchInput = z.input<typeof tourSearchSchema>;
export type TourSearchValues = z.output<typeof tourSearchSchema>;

export const newsletterSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

export type NewsletterValues = z.infer<typeof newsletterSchema>;

/** YYYY-MM-DD that is also a real calendar date */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Enter a valid date");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{6,20}$/, "Enter a valid phone number");

export const packageSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid package").max(200);

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(120, "Name is too long"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(254),
  phone: phoneSchema.optional().or(z.literal("")),
  travelDate: isoDateSchema.optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more about your trip (min. 10 characters)")
    .max(5000, "Message is too long (max 5000 characters)"),
  /** Set when the enquiry is a booking request for a specific tour package */
  packageSlug: packageSlugSchema.optional(),
  /** Display only — the server uses the package's own title */
  packageTitle: z.string().max(300).optional(),
});

export type ContactValues = z.infer<typeof contactSchema>;

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(120, "Name is too long"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(254),
    // bcrypt only uses the first 72 bytes, so cap the length
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long (max 72 characters)"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterValues = z.infer<typeof registerSchema>;
