"use client";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Download,
  Flame,
  Layers,
  Printer,
  Sparkles,
} from "lucide-react";
import { useToday } from "@/lib/use-today";
import { dayKey, streak } from "@/lib/learning";
import type { ContentPack } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { downloadJson, PageHeading } from "./ui";

export function ProgressDashboard({
  content,
  serverDay,
}: {
  content: ContentPack;
  serverDay: string;
}) {
  const { progress, setGoal } = useProgress();
  const completed = content.lessons.filter((lesson) =>
    progress.completed.includes(lesson.id),
  );
  const saved = content.words.filter((word) =>
    progress.saved.includes(word.id),
  );
  const mastered = content.words.filter(
    (word) => (progress.reviews[word.id]?.repetitions ?? 0) >= 3,
  );
  const day = useToday(serverDay);
  const today = progress.activity[day] ?? 0;
  const days = Array.from({ length: 56 }, (_, i) => {
    const date = new Date(`${day}T12:00:00`);
    date.setDate(date.getDate() - 55 + i);
    return { day: dayKey(date), count: progress.activity[dayKey(date)] ?? 0 };
  });
  const stats = [
    {
      icon: Flame,
      value: streak(progress.activity, new Date(`${day}T12:00:00`)),
      label: "Day learning streak",
    },
    { icon: BookOpen, value: completed.length, label: "Lessons completed" },
    { icon: Layers, value: saved.length, label: "Words collected" },
    { icon: Sparkles, value: mastered.length, label: "Words remembered" },
  ];
  return (
    <>
      <PageHeading
        eyebrow="EVERY LITTLE STEP COUNTS"
        title="Look how far you’ve come."
        description="Your discoveries, your practice, your own little learning journey."
        action={
          <button className="button secondary" onClick={() => window.print()}>
            <Printer size={14} />
            Print my progress
          </button>
        }
      />
      <div className="stat-grid">
        {stats.map(({ icon: Icon, value, label }) => (
          <div className="stat-card" key={label}>
            <span className="stat-icon">
              <Icon size={19} />
            </span>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="progress-layout">
        <div>
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>A little learning, day by day</h2>
                <p>Your last eight weeks of curiosity.</p>
              </div>
              <Flame size={20} color="#a4b78c" />
            </div>
            <div className="activity-grid">
              {days.map(({ day, count }) => (
                <div
                  className={`activity-cell ${count ? `level-${Math.min(3, Math.ceil(count / 4))}` : ""}`}
                  key={day}
                  title={`${day} · ${count} activities`}
                  role="img"
                  aria-label={`${day}, ${count} activities`}
                />
              ))}
            </div>
            <div className="activity-legend">
              <span>{days[0].day}</span>
              <span>Less ▫ ▪ ▰ More</span>
              <span>Today</span>
            </div>
          </section>
          <section className="panel" style={{ marginTop: 24 }}>
            <div className="section-heading">
              <div>
                <h2>Recent little wins</h2>
                <p>Your latest practice sessions.</p>
              </div>
            </div>
            {progress.attempts.length ? (
              <div className="attempt-list">
                {progress.attempts.slice(0, 10).map((attempt) => (
                  <div className="attempt" key={attempt.id}>
                    <span className="stat-icon">
                      <CheckCircle2 size={17} />
                    </span>
                    <div>
                      <h3>{attempt.title}</h3>
                      <p>
                        {new Date(attempt.date).toLocaleDateString("en", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <strong>
                      {attempt.score} / {attempt.total}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "20px 0" }}>
                <p className="muted" style={{ fontSize: 12, marginBottom: 15 }}>
                  Your first little win is waiting. Try a word game to get
                  started.
                </p>
                <Link className="button primary" href="/games">
                  Find your first challenge
                </Link>
              </div>
            )}
          </section>
        </div>
        <aside>
          <section className="panel goal-panel">
            <h3>Your daily learning goal</h3>
            <div
              className="goal-circle"
              style={
                {
                  "--percent": `${Math.min(100, (today / progress.goal) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong>
                  {today}/{progress.goal}
                </strong>
                <small>ACTIVITIES TODAY</small>
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="daily-goal">Make it your own</label>
              <select
                id="daily-goal"
                value={progress.goal}
                onChange={(e) => setGoal(Number(e.target.value))}
              >
                {[...new Set([5, 10, 15, 20, progress.goal])]
                  .sort((a, b) => a - b)
                  .map((goal) => (
                    <option key={goal} value={goal}>
                      {goal} activities per day
                    </option>
                  ))}
              </select>
            </div>
            <p>
              A lesson, a game, or a flashcard review counts as one activity.
            </p>
          </section>
          <section className="panel" style={{ marginTop: 24 }}>
            <h3>Keep your discoveries</h3>
            <p
              className="muted"
              style={{ fontSize: 11, margin: "12px 0 19px" }}
            >
              Progress belongs to this browser. Save a backup to bring it to
              another device.
            </p>
            <button
              className="button secondary"
              onClick={() =>
                downloadJson(progress, "lingualocal-progress.json")
              }
            >
              <Download size={14} />
              Save a backup
            </button>
            <div className="progress-lessons">
              <h3>Lessons explored</h3>
              {completed.length ? (
                completed.map((lesson) => (
                  <p key={lesson.id}>✓ {lesson.title}</p>
                ))
              ) : (
                <p>There’s a first chapter for everything.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
