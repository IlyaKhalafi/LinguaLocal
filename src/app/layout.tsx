import type { Metadata } from "next";
import { Suspense } from "react";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-arabic";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "./globals.css";
import "./theme.css";
import "./reading.css";
import { getRequestPreferences } from "@/lib/preferences-server";
import { preferenceAttributes } from "@/lib/preferences";
import { PreferencesProvider } from "@/components/preferences-provider";
import { OfflineBridge } from "@/components/offline-bridge";
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
  const preferences = await getRequestPreferences();
  return (
    <html
      lang={locale}
      dir={direction(locale)}
      {...preferenceAttributes(preferences)}
    >
      <body>
        <div id="client-notices" className="client-notices" />
        <LocaleProvider initialLocale={locale}>
          <PreferencesProvider initialPreferences={preferences}>
            <ProgressProvider>
              <Suspense fallback={null}>
                <OfflineBridge />
              </Suspense>
              <Shell settings={settings}>
                {warning && (
                  <p className="inline-message" role="status">
                    <LocalizedText text={warning} />
                  </p>
                )}
                {children}
              </Shell>
            </ProgressProvider>
          </PreferencesProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
