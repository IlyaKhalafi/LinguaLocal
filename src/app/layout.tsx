import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-arabic";
import "./globals.css";
import { Shell } from "@/components/shell";
import { ProgressProvider } from "@/components/progress-provider";
import { getSettingsState } from "@/lib/content";
import { direction } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";
import { LocaleProvider } from "@/components/locale-provider";
import { LocalizedText } from "@/components/localized-text";

export const metadata: Metadata = {
  title: {
    default: "LinguaLocal",
    template: "%s | LinguaLocal",
  },
  description:
    "Books, listening, vocabulary, and a little everyday discovery. A language learning hub that lives on your school network.",
};
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { settings, warning } = await getSettingsState();
  const locale = await getRequestLocale();
  return (
    <html lang={locale} dir={direction(locale)}>
      <body>
        <LocaleProvider initialLocale={locale}>
          <ProgressProvider>
            <Shell settings={settings}>
              {warning && (
                <p className="inline-message" role="status">
                  <LocalizedText text={warning} />
                </p>
              )}
              {children}
            </Shell>
          </ProgressProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
