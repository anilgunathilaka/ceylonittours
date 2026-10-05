/**
 * End-to-end smoke test against a running server (ideally a production build
 * pointed at a disposable database):
 *
 *   E2E_ADMIN_EMAIL=e2e-admin@example.test   # must also be in the server's ADMIN_EMAILS
 *   BASE_URL=http://localhost:3127 npm run test:e2e
 *
 * Creates its own users/bookings with random emails.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
if (!ADMIN_EMAIL) {
  console.error("Set E2E_ADMIN_EMAIL (and include it in the server's ADMIN_EMAILS)");
  process.exit(1);
}

const SLUG = "ella-drop-tour-via-nuwara-eliya";
const run = Math.random().toString(36).slice(2, 8);
let failures = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : `  — ${detail}`}`);
  if (!ok) failures++;
}

/** Minimal cookie-jar client */
function client() {
  const jar = new Map();
  async function request(path, init = {}) {
    const headers = new Headers(init.headers);
    if (jar.size) headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    const res = await fetch(new URL(path, BASE), { ...init, headers, redirect: "manual" });
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const [key, ...rest] = pair.split("=");
      jar.set(key.trim(), rest.join("="));
    }
    return res;
  }
  return {
    request,
    async register(email, name, password = "secret123") {
      return request("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword: password }),
      });
    },
    async login(email, password = "secret123") {
      const { csrfToken } = await (await request("/api/auth/csrf")).json();
      const res = await request("/api/auth/callback/credentials", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, email, password }),
      });
      const session = await (await request("/api/auth/session")).json();
      return { res, session };
    },
  };
}

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Submit the admin form exactly as a no-JS browser would (React's progressive-enhancement fields). */
async function submitAdminForm(c, html, bookingId, fields) {
  const forms = html.split("<form").slice(1).map((f) => f.split("</form>")[0]);
  const formHtml = forms.find((f) => f.includes(`value="${bookingId}"`));
  if (!formHtml) throw new Error("admin form not found");
  const data = new FormData();
  for (const m of formHtml.matchAll(/<input type="hidden" name="([^"]*)"(?: value="([^"]*)")?/g)) {
    data.set(m[1], decode(m[2] ?? ""));
  }
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return c.request("/admin/bookings", { method: "POST", body: data });
}

const customer = client();
const other = client();
const admin = client();
const anon = client();
const customerEmail = `e2e-cust-${run}@example.test`;

// --- Auth -----------------------------------------------------------------
check("register customer", (await customer.register(customerEmail, "E2E Customer")).status === 201);
check("duplicate email rejected (409)", (await anon.register(customerEmail.toUpperCase(), "Dup")).status === 409);
check("invalid registration rejected (400)", (await anon.register("bad", "x", "1")).status === 400);
await other.register(`e2e-other-${run}@example.test`, "Other Customer");
const adminReg = await admin.register(ADMIN_EMAIL, "E2E Admin");
check("register admin (or already exists)", [201, 409].includes(adminReg.status));

const wrong = await anon.login(customerEmail, "wrongpass1");
check("wrong password rejected", !wrong.session?.user);
const { session } = await customer.login(customerEmail);
check("customer login", session?.user?.email === customerEmail && session.user.isAdmin === false);
await other.login(`e2e-other-${run}@example.test`);
const adminLogin = await admin.login(ADMIN_EMAIL);
check("admin login with isAdmin flag", adminLogin.session?.user?.isAdmin === true);

// --- Protected routes + redirects -------------------------------------------
let res = await anon.request("/profile");
check("logged-out /profile -> login", res.status === 307 && res.headers.get("location")?.includes("/login?callbackUrl=%2Fprofile"));
res = await customer.request("/login?callbackUrl=https://evil.com");
check("open redirect blocked", res.status === 307 && new URL(res.headers.get("location"), BASE).origin === new URL(BASE).origin);
res = await anon.request("/admin/bookings");
check("logged-out /admin/bookings -> login", res.status === 307 && res.headers.get("location")?.includes("/login"));
check("customer /admin/bookings -> 404", (await customer.request("/admin/bookings")).status === 404);
check("admin /admin/bookings -> 200", (await admin.request("/admin/bookings")).status === 200);

// --- Booking ----------------------------------------------------------------
res = await customer.request("/api/contact", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    name: "E2E Customer",
    email: customerEmail,
    phone: "+94 77 123 4567",
    travelDate: "2027-01-15",
    message: `Two adults <script>alert("x")</script>`,
    packageSlug: SLUG,
    packageTitle: "Forged title",
  }),
});
check("customer creates booking", res.status === 200);

let profile = await (await customer.request("/profile")).text();
check("booking pending on customer profile", profile.includes(">Pending<") && profile.includes("Ella"));
check("forged package title ignored", !profile.includes("Forged title"));

const otherProfile = await (await other.request("/profile")).text();
check("other customer cannot see the booking", !otherProfile.includes("E2E Customer") && !otherProfile.includes("Two adults"));

let adminHtml = await (await admin.request("/admin/bookings?status=pending")).text();
// The <article> for this customer's booking holds its form
const article = adminHtml.split("<article").find((a) => a.includes(customerEmail)) ?? "";
const bookingId = article.match(/name="bookingId" value="([^"]+)"/)?.[1];
check("admin sees the booking", adminHtml.includes(customerEmail) && Boolean(bookingId));
check("customer HTML is escaped on admin page", !adminHtml.includes(`<script>alert("x")</script>`) && adminHtml.includes("&lt;script&gt;"));

// Customer tries to call the admin action directly
await submitAdminForm(customer, adminHtml, bookingId, { status: "confirmed", message: "hacked", notify: "" });
profile = await (await customer.request("/profile")).text();
check("customer cannot confirm via server action", !profile.includes("hacked"));

// Admin confirms
res = await submitAdminForm(admin, adminHtml, bookingId, {
  status: "confirmed",
  travelDate: "2027-01-16",
  message: "Pickup 7:00 AM from your hotel",
  notify: "on",
});
check("admin confirm action accepted", res.status === 200);
profile = await (await customer.request("/profile")).text();
check("customer sees confirmation message", profile.includes("Pickup 7:00 AM from your hotel"));
check("booking listed as confirmed", profile.includes("Confirmed"));

// Stale second submission (same version) is rejected
await submitAdminForm(admin, adminHtml, bookingId, { status: "cancelled", message: "stale cancel", notify: "" });
profile = await (await customer.request("/profile")).text();
check("stale admin update rejected", !profile.includes("stale cancel"));

// Cancel with the fresh version, then reopen
adminHtml = await (await admin.request("/admin/bookings?status=upcoming")).text();
await submitAdminForm(admin, adminHtml, bookingId, { status: "cancelled", message: "Weather warning", notify: "" });
profile = await (await customer.request("/profile")).text();
check("cancellation visible to customer", profile.includes("Weather warning") && profile.includes("Cancelled"));
adminHtml = await (await admin.request("/admin/bookings?status=cancelled")).text();
await submitAdminForm(admin, adminHtml, bookingId, { status: "pending", notify: "" });
adminHtml = await (await admin.request("/admin/bookings?status=pending")).text();
check("reopened booking back in pending with history", adminHtml.includes(customerEmail) && adminHtml.includes("Status history"));

console.log(`\n${failures === 0 ? "All checks passed" : `${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
