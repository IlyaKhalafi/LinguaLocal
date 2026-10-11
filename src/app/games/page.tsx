import Link from "next/link";
import { ArrowRight, Brain, Layers, Puzzle, Sparkles } from "lucide-react";
import { PageHeading } from "@/components/ui";
export const metadata = { title: "Practice & play" };
export default function GamesPage() {
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
      <PageHeading title="Games" />
      <div className="game-grid">
        {games.map(({ icon: Icon, title, description, href, label }) => (
          <article className="game-card" key={title}>
            <div className="game-art" aria-hidden="true">
              <Icon size={69} strokeWidth={1} />
              <Sparkles size={28} strokeWidth={1} />
            </div>
            <div className="game-card-copy">
              <h3>{title}</h3>
              <p>{description}</p>
              <Link className="button secondary" href={href} aria-label={label}>
                Start
                <ArrowRight size={14} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
