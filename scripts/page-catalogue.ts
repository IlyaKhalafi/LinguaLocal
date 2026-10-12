import { encodeAssignment } from "../src/lib/assignments";
import assignment from "../examples/assignment.json";
import seed from "../src/content/starter.json";
type PagePreview = {
  name: string;
  path: string;
  heading: string;
  label?: string;
  displayPath?: string;
};
export const pageCatalogue: readonly PagePreview[] = [
  { name: "overview", path: "/", heading: "Home" },
  { name: "library", path: "/library", heading: "Library" },
  { name: "dictionary", path: "/dictionary", heading: "Dictionary" },
  { name: "lessons", path: "/lessons", heading: "Lessons" },
  { name: "games", path: "/games", heading: "Games" },
  { name: "practice", path: "/games/practice", heading: "Practice" },
  { name: "quiz", path: "/games/quiz", heading: "Vocabulary quiz" },
  { name: "matching", path: "/games/match", heading: "Matching" },
  { name: "flashcards", path: "/flashcards", heading: "Flashcards" },
  {
    name: "lesson-review",
    path: "/flashcards?lesson=present-simple",
    heading: "Flashcards",
    label: "Lesson vocabulary review",
  },
  {
    name: "assignment",
    path: `/assignment?plan=${encodeURIComponent(encodeAssignment(assignment))}`,
    heading: assignment.title,
    label: "Classroom assignment",
    displayPath: "/assignment?plan=PLAN",
  },
  {
    name: "assignment-invalid",
    path: "/assignment",
    heading: "Assignment",
    label: "Unavailable assignment link",
  },
  { name: "progress", path: "/progress", heading: "Progress" },
  { name: "settings", path: "/settings", heading: "Settings" },
  ...seed.books.map((book) => ({
    name: `book-${book.id}`,
    path: `/library/${book.id}`,
    heading: book.title,
  })),
  ...seed.lessons.map((lesson) => ({
    name: `lesson-${lesson.id}`,
    path: `/lessons/${lesson.id}`,
    heading: lesson.title,
  })),
  { name: "not-found", path: "/not-a-page", heading: "Page not found" },
];
