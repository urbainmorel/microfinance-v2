import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

describe("Input component — Password Visibility Toggle", () => {
  it("renders standard input without password toggle button when type is text or email", () => {
    const htmlText = renderToStaticMarkup(<Input type="text" placeholder="Entrez un texte" />);
    expect(htmlText).toContain('type="text"');
    expect(htmlText).not.toContain("<button");
    expect(htmlText).not.toContain("Afficher le mot de passe");

    const htmlEmail = renderToStaticMarkup(<Input type="email" placeholder="test@example.com" />);
    expect(htmlEmail).toContain('type="email"');
    expect(htmlEmail).not.toContain("<button");
  });

  it("renders password input with visibility toggle button and accessibility attributes", () => {
    const html = renderToStaticMarkup(
      <Input id="pwd" type="password" placeholder="••••••••" defaultValue="secret123" />,
    );

    // Should render input with type="password"
    expect(html).toContain('type="password"');
    expect(html).toContain('id="pwd"');
    // Should include the relative wrapper with pr-12 padding
    expect(html).toContain("relative flex w-full items-center");
    expect(html).toContain("pr-12");
    // Should include the toggle button with aria labels
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="Afficher le mot de passe"');
    expect(html).toContain('title="Afficher le mot de passe"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("allows opting out of toggle with showPasswordToggle={false}", () => {
    const html = renderToStaticMarkup(
      <Input type="password" showPasswordToggle={false} placeholder="••••" />,
    );

    expect(html).toContain('type="password"');
    expect(html).not.toContain("<button");
    expect(html).not.toContain("Afficher le mot de passe");
  });

  it("integrates seamlessly into FormField for password inputs", () => {
    const html = renderToStaticMarkup(
      <FormField
        id="login-pass"
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
      />,
    );

    expect(html).toContain('for="login-pass"');
    expect(html).toContain("Mot de passe");
    expect(html).toContain('id="login-pass"');
    expect(html).toContain('type="password"');
    expect(html).toContain('aria-label="Afficher le mot de passe"');
  });
});
