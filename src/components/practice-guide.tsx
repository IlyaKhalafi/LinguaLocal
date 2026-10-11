import { BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import type { Word } from "@/lib/schema";

export function PracticeGuide({
  words,
  title = "A little practice, at your own pace",
}: {
  words: Word[];
  title?: string;
}) {
  return (
    <section className="practice-guide">
      <div className="section-heading">
        <h2>{title}</h2>
        <Sparkles size={19} />
      </div>
      <div className="practice-steps">
        {[
          {
            icon: BookOpen,
            title: "Take your time",
            text: "No timer. Just a little space to think.",
          },
          {
            icon: CheckCircle2,
            title: "Learn as you go",
            text: "Every answer is another discovery.",
          },
          {
            icon: Sparkles,
            title: "See yourself grow",
            text: "Your practice becomes part of your journey.",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon size={20} strokeWidth={1.4} />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div className="word-preview">
        <span>A few words you might meet</span>
        {words.slice(0, 4).map((word) => (
          <span className="badge" key={word.id}>
            {word.word}
          </span>
        ))}
      </div>
    </section>
  );
}
