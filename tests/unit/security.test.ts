import { describe, expect, it } from "vitest";
import { safeCallbackUrl, DEFAULT_AUTH_REDIRECT } from "@/lib/auth/redirect";
import { escapeHtml } from "@/lib/email";
import { isAdminEmail } from "@/lib/auth/roles";
import { contactSchema, isoDateSchema, registerSchema } from "@/lib/validation/schemas";
import { publicErrorMessage } from "@/lib/errors";

describe("safeCallbackUrl (open redirect prevention)", () => {
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined])(
    "rejects %s",
    (value) => expect(safeCallbackUrl(value)).toBe(DEFAULT_AUTH_REDIRECT),
  );
  it("keeps same-site paths", () => {
    expect(safeCallbackUrl("/contact?package=x&title=y")).toBe("/contact?package=x&title=y");
  });
});

describe("escapeHtml", () => {
  it("neutralises HTML and attribute injection", () => {
    expect(escapeHtml(`<script>alert("x")</script>' &`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&#39; &amp;",
    );
  });
});

describe("isAdminEmail", () => {
  it("parses, trims and normalises ADMIN_EMAILS", () => {
    expect(isAdminEmail("admin@example.test")).toBe(true);
    expect(isAdminEmail("  OPS@example.TEST ")).toBe(true);
  });
  it("rejects others and empty values", () => {
    expect(isAdminEmail("customer@example.test")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail("admin@example.test.evil.com")).toBe(false);
  });
});

describe("validation", () => {
  it("accepts real dates only", () => {
    expect(isoDateSchema.safeParse("2026-12-20").success).toBe(true);
    expect(isoDateSchema.safeParse("2026-02-30").success).toBe(false);
    expect(isoDateSchema.safeParse("20-12-2026").success).toBe(false);
  });
  it("validates contact fields and package references", () => {
    const base = { name: "Kasun", email: "k@example.test", message: "Two adults, hotel pickup." };
    expect(contactSchema.safeParse(base).success).toBe(true);
    expect(contactSchema.safeParse({ ...base, phone: "+94 77 123 4567" }).success).toBe(true);
    expect(contactSchema.safeParse({ ...base, phone: "<script>" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...base, packageSlug: "../../etc" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
  });
  it("caps password length for bcrypt", () => {
    const base = { name: "Kasun", email: "k@example.test" };
    expect(registerSchema.safeParse({ ...base, password: "a".repeat(73), confirmPassword: "a".repeat(73) }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "secret123", confirmPassword: "secret123" }).success).toBe(true);
  });
});

describe("publicErrorMessage", () => {
  it("hides diagnostics outside development", () => {
    const original = process.env.NODE_ENV;
    // @ts-expect-error NODE_ENV is read-only in types
    process.env.NODE_ENV = "production";
    expect(publicErrorMessage("Unable to confirm booking.", new Error("connect ECONNREFUSED postgres://secret"))).toBe(
      "Unable to confirm booking.",
    );
    // @ts-expect-error restore
    process.env.NODE_ENV = original;
  });
});
