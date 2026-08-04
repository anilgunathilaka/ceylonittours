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

export const contactSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  phone: z.string().optional(),
  travelDate: z.string().optional(),
  message: z.string().min(10, "Tell us a little more about your trip (min. 10 characters)"),
});

export type ContactValues = z.infer<typeof contactSchema>;
