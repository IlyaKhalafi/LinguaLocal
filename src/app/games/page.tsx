import Link from "next/link";
import { ArrowRight, Brain, Layers, Puzzle, Sparkles } from "lucide-react";
import { PageHeading } from "@/components/ui";
export const metadata = { title: "Practice & play" };
export default function GamesPage() {
  const games = [
    {
      icon: Brain,
      title: "Word explorer",
      description:
        "A word, four meanings. Follow your curiosity and discover how much you know.",
      href: "/games/quiz",
      label: "Play the vocabulary quiz",
    },
    {
      icon: Puzzle,
      title: "Perfect pairs",
      description:
        "Bring words and their meanings together. A little challenge for your memory.",
      href: "/games/match",
      label: "Play the matching game",
    },
    {
      icon: Layers,
      title: "Make it stick",
      description:
        "Flip a card, take your time, and turn new vocabulary into familiar friends.",
      href: "/flashcards",
      label: "Study with flashcards",
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE PLAY. A LOT OF LEARNING."
        title="Let your curiosity play."
        description="Short, satisfying practice that helps new words feel like old friends."
      />
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
                Let’s play
                <ArrowRight size={14} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="game-note">
        <Sparkles size={24} color="#859e6c" />
        <p>
          There’s no rush and no leaderboard. Just you, a few new words, and a
          little more confidence every time.
        </p>
      </div>
    </>
  );
}
