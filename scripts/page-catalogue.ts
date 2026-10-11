import seed from "../src/content/starter.json";
export const pageCatalogue = [
  { name: "overview", path: "/" },
  { name: "library", path: "/library" },
  { name: "dictionary", path: "/dictionary" },
  { name: "lessons", path: "/lessons" },
  { name: "games", path: "/games" },
  { name: "quiz", path: "/games/quiz" },
  { name: "matching", path: "/games/match" },
  { name: "flashcards", path: "/flashcards" },
  { name: "progress", path: "/progress" },
  { name: "settings", path: "/settings" },
  ...seed.books.map((book) => ({
    name: `book-${book.id}`,
    path: `/library/${book.id}`,
  })),
  ...seed.lessons.map((lesson) => ({
    name: `lesson-${lesson.id}`,
    path: `/lessons/${lesson.id}`,
  })),
  { name: "not-found", path: "/not-a-page" },
];
