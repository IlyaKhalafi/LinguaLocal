"use client";
import { useLocale } from "@/components/locale-provider";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Layers,
  Printer,
  Sparkles,
} from "lucide-react";
import { useToday } from "@/lib/use-today";
import { dayKey, streak } from "@/lib/learning";
import type { ContentPack } from "@/lib/schema";
import { useProgress } from "./progress-provider";
import { PageHeading } from "./ui";

export function ProgressDashboard({
  content,
  serverDay,
}: {
  content: ContentPack;
  serverDay: string;
}) {
  const { t, locale } = useLocale();
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
      label: "Day streak",
    },
    { icon: BookOpen, value: completed.length, label: "Completed lessons" },
    { icon: Layers, value: saved.length, label: "Saved words" },
    { icon: Sparkles, value: mastered.length, label: "Words learned" },
  ];
  return (
    <>
      <PageHeading
        title={t("Progress")}
        action={
          <button className="button secondary" onClick={() => window.print()}>
            <Printer size={14} />
            {t("Print progress")}
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
              <div className="stat-value">{t("{count}", { count: value })}</div>
              <div className="stat-label">{t(label)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="progress-layout">
        <div>
          <section className="panel">
            <div className="section-heading">
              <div>
                <h2>{t("Activity")}</h2>
                <p>{t("Last 8 weeks")}</p>
              </div>
              <Flame size={20} color="#a4b78c" />
            </div>
            <div
              className="activity-grid"
              role="img"
              aria-label={t("{count} activities in the last 8 weeks", {
                count: days.reduce((sum, day) => sum + day.count, 0),
              })}
            >
              {days.map(({ day, count }) => (
                <div
                  className={`activity-cell ${count ? `level-${Math.min(3, Math.ceil(count / 4))}` : ""}`}
                  key={day}
                  title={t("{day} · {count} activities", { day, count })}
                  aria-hidden="true"
                />
              ))}
            </div>
            <div className="activity-legend">
              <span>{days[0].day}</span>
              <span>{t("Less ▫ ▪ ▰ More")}</span>
              <span>{t("Today")}</span>
            </div>
            <details className="activity-details">
              <summary>{t("Activity details")}</summary>
              <table>
                <thead>
                  <tr>
                    <th>{t("Date")}</th>
                    <th>{t("Activities")}</th>
                  </tr>
                </thead>
                <tbody>
                  {days
                    .filter((day) => day.count > 0)
                    .map(({ day, count }) => (
                      <tr key={day}>
                        <td>
                          <bdi dir="ltr">{day}</bdi>
                        </td>
                        <td>{t("{count}", { count })}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!days.some((day) => day.count > 0) && (
                <p>{t("No practice sessions yet.")}</p>
              )}
            </details>
          </section>
          <section className="panel" style={{ marginTop: 24 }}>
            <div className="section-heading">
              <div>
                <h2>{t("Recent sessions")}</h2>
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
                      <h3>{t(attempt.title)}</h3>
                      <p>
                        {new Date(attempt.date).toLocaleDateString(locale, {
                          calendar: "gregory",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <strong dir="ltr">
                      {t("{current} / {total}", {
                        current: attempt.score,
                        total: attempt.total,
                      })}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "20px 0" }}>
                <p className="muted" style={{ fontSize: 12, marginBottom: 15 }}>
                  {t("No practice sessions yet.")}
                </p>
                <Link className="button primary" href="/games">
                  {t("Open games")}
                </Link>
              </div>
            )}
          </section>
        </div>
        <aside>
          <section className="panel goal-panel">
            <h3>{t("Daily goal")}</h3>
            <div
              className="goal-circle"
              style={
                {
                  "--percent": `${Math.min(100, (today / progress.goal) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong dir="ltr">
                  {t("{current} / {total}", {
                    current: today,
                    total: progress.goal,
                  })}
                </strong>
                <small>{t("Activities today")}</small>
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="daily-goal">{t("Activities per day")}</label>
              <select
                id="daily-goal"
                value={progress.goal}
                onChange={(e) => setGoal(Number(e.target.value))}
              >
                {[...new Set([5, 10, 15, 20, progress.goal])]
                  .sort((a, b) => a - b)
                  .map((goal) => (
                    <option key={goal} value={goal}>
                      {t("{count} activities per day", { count: goal })}
                    </option>
                  ))}
              </select>
            </div>
            <p>
              {t(
                "A lesson, a game, or a flashcard review counts as one activity.",
              )}
            </p>
          </section>
          <section className="panel" style={{ marginTop: 24 }}>
            <div className="progress-lessons">
              <h3>{t("Completed lessons")}</h3>
              {completed.length ? (
                completed.map((lesson) => (
                  <p key={lesson.id} lang="en" dir="ltr">
                    ✓ {lesson.title}
                  </p>
                ))
              ) : (
                <p>{t("No completed lessons.")}</p>
              )}
            </div>
            <Link className="text-link" href="/settings">
              {t("Progress backup")}
            </Link>
          </section>
        </aside>
      </div>
    </>
  );
}
