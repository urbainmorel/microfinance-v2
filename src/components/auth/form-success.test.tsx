import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormSuccess } from "@/components/auth/form-success";

describe("FormSuccess", () => {
  it("ne rend rien si message est null ou vide", () => {
    const htmlNull = renderToStaticMarkup(<FormSuccess message={null} />);
    expect(htmlNull).toBe("");

    const htmlEmpty = renderToStaticMarkup(<FormSuccess message="" />);
    expect(htmlEmpty).toBe("");
  });

  it("affiche le message avec le rôle status et le style approprié", () => {
    const html = renderToStaticMarkup(
      <FormSuccess message="Email vérifié ! Connectez-vous pour continuer." />,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("Email vérifié ! Connectez-vous pour continuer.");
    expect(html).toContain("bg-emerald-50");
  });
});
