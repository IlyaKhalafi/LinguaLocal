import { notFound } from "next/navigation";
import { getContent } from "@/lib/content";
import { BookDetail } from "@/components/book-detail";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = (await getContent()).books.find((item) => item.id === id);
  return { title: item?.title ?? "LinguaLocal" };
}
export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = (await getContent()).books.find((book) => book.id === id);
  if (!book) notFound();
  return <BookDetail book={book} />;
}
