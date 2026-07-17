import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Content, Quiz } from "@/lib/types";
import ContentActions from "@/components/ContentActions";
import Markdown from "@/components/Markdown";

export const dynamic = "force-dynamic";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: content } = await supabase
    .from("content").select("*").eq("id", id).single();
  if (!content) notFound();
  const c = content as Content;

  const { data: quizRow } = await supabase
    .from("quizzes").select("*").eq("content_id", id).maybeSingle();
  const quiz = (quizRow as Quiz) ?? null;

  let completed = false;
  if (user) {
    const { data: comp } = await supabase
      .from("content_completions")
      .select("id").eq("content_id", id).eq("user_id", user.id).maybeSingle();
    completed = !!comp;
  }

  let pdfUrl: string | null = null;
  if (c.type === "pdf" && c.file_path) {
    pdfUrl = supabase.storage.from("content-files").getPublicUrl(c.file_path).data.publicUrl;
  }

  return (
    <article>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="uppercase font-medium text-upm">{c.type}</span>
        {c.category && <span>· {c.category}</span>}
      </div>
      <h1 className="text-3xl font-bold mt-1">{c.title}</h1>
      {c.description && <p className="mt-2 text-gray-600">{c.description}</p>}

      <div className="mt-6 rounded-xl border bg-white p-6">
        {c.type === "article" && c.body ? (
          <Markdown>{c.body}</Markdown>
        ) : pdfUrl ? (
          <div>
            <iframe src={pdfUrl} className="w-full h-[600px] rounded-lg border" />
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-block text-upm font-medium">Open PDF in new tab ↗</a>
          </div>
        ) : (
          <p className="text-gray-500">No content available.</p>
        )}
      </div>

      {user && (
        <ContentActions contentId={c.id} quiz={quiz} initiallyCompleted={completed} />
      )}
    </article>
  );
}
