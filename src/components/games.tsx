"use client";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import { ArrowRight, Brain, Layers, Puzzle, Sparkles } from "lucide-react";
import { PageHeading } from "@/components/ui";
export function Games() {
  const { t } = useLocale();
  const games = [
    {
      icon: Brain,
      title: "Vocabulary quiz",
      description: "Choose the correct meaning.",
      href: "/games/quiz",
      label: "Play the vocabulary quiz",
    },
    {
      icon: Puzzle,
      title: "Matching",
      description: "Match words with definitions.",
      href: "/games/match",
      label: "Play the matching game",
    },
    {
      icon: Layers,
      title: "Flashcards",
      description: "Review and remember words.",
      href: "/flashcards",
      label: "Study with flashcards",
    },
  ];
  return (
    <>
      <PageHeading title={t("Games")} />
      <div className="game-grid">
        {games.map(({ icon: Icon, title, description, href }) => (
          <article className="game-card" key={title}>
            <div className="game-art" aria-hidden="true">
              <Icon size={69} strokeWidth={1} />
              <Sparkles size={28} strokeWidth={1} />
            </div>
            <div className="game-card-copy">
              <h3>{t(title)}</h3>
              <p>{t(description)}</p>
              <Link
                className="button secondary"
                href={href}
                aria-label={`${t("Start")} ${t(title)}`}
              >
                {t("Start")}
                <ArrowRight size={14} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
