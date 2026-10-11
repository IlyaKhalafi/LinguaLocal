import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Shell } from "@/components/shell";
import { ProgressProvider } from "@/components/progress-provider";
import { getSettingsState } from "@/lib/content";

export const metadata: Metadata = {
  title: {
    default: "LinguaLocal | Your local learning space",
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
  return (
    <html lang="en">
      <body>
        <ProgressProvider>
          <Shell settings={settings}>
            {warning && (
              <p className="inline-message" role="status">
                {warning}
              </p>
            )}
            {children}
          </Shell>
        </ProgressProvider>
      </body>
    </html>
  );
}
