import { localizedMetadata } from "@/lib/locale-server";
import { createHash } from "node:crypto";
import { getContent } from "@/lib/content";
import {
  decodeAssignment,
  encodeAssignment,
  resolveAssignment,
} from "@/lib/assignments";
import { AssignmentPage } from "@/components/assignment";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const assignment = decodeAssignment(plan);
  return assignment
    ? { title: assignment.title }
    : localizedMetadata("Assignment");
}
export default async function AssignmentRoute({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const assignment = decodeAssignment(plan);
  if (!assignment) return <AssignmentPage />;
  const id = createHash("sha256")
    .update(encodeAssignment(assignment))
    .digest("hex");
  return (
    <AssignmentPage
      key={id}
      id={id}
      assignment={assignment}
      tasks={resolveAssignment(assignment, await getContent())}
    />
  );
}
