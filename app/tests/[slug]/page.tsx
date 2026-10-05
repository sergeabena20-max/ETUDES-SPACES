import { redirect } from "next/navigation";

export default async function TestDetailAlias({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect("/quizzes/" + encodeURIComponent(slug));
}
