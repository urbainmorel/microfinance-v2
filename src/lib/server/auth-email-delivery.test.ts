import { afterEach, describe, expect, it, vi } from "vitest";

import { sendAuthEmail } from "./auth-email-delivery";
import type { AuthEmailMessage } from "./auth-email";
import type { AuthEmailSettings } from "./auth-email-settings";

const settings: AuthEmailSettings = {
  resendApiKey: "re_test",
  brevoApiKey: "brevo_test",
  hookSecret: "v1,whsec_test",
  resendFrom: "Azari Microfinance <noreply@mail.azari-microfinance.site>",
  brevoFrom: "Azari Microfinance <support@azari-microfinance.site>",
  siteUrl: "https://azari-microfinance.site",
};

const message: AuthEmailMessage = {
  recipientEmail: "client@example.test",
  subject: "Confirmez votre compte",
  html: "<p>Confirmez</p>",
  text: "Confirmez",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendAuthEmail", () => {
  it("bascule sur Brevo quand Resend échoue", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(sendAuthEmail(message, settings, "auth-test-1")).resolves.toBe("brevo");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.resend.com/emails");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.brevo.com/v3/smtp/email");
    const brevoBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      sender: { email: string };
      to: Array<{ email: string }>;
      textContent: string;
    };
    expect(brevoBody.sender.email).toBe("support@azari-microfinance.site");
    expect(brevoBody.to[0]?.email).toBe("client@example.test");
    expect(brevoBody.textContent).toBe("Confirmez");
  });

  it("échoue si Resend et Brevo échouent", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(sendAuthEmail(message, settings, "auth-test-2")).rejects.toThrow("brevo_500");
  });
});
