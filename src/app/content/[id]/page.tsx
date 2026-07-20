import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Content, Quiz, SurveyQuestion } from "@/lib/types";
import ContentActions from "@/components/ContentActions";
import Markdown from "@/components/Markdown";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  pdf: "PDF", article: "Article", quiz: "Quiz", questionnaire: "Questionnaire",
};

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

  const { data: quizRows } = await supabase
    .from("quizzes").select("*").eq("content_id", id).order("created_at");
  const quizzes = (quizRows as Quiz[]) ?? [];

  const { data: surveyRows } = await supabase
    .from("survey_questions").select("*").eq("content_id", id).order("position");
  const surveyQuestions = (surveyRows as SurveyQuestion[]) ?? [];

  let completed = false;
  let surveyDone = false;
  if (user) {
    const { data: comp } = await supabase
      .from("content_completions")
      .select("id").eq("content_id", id).eq("user_id", user.id).maybeSingle();
    completed = !!comp;
    if (surveyQuestions.length) {
      const { data: resp } = await supabase
        .from("survey_responses")
        .select("id").eq("content_id", id).eq("user_id", user.id).maybeSingle();
      surveyDone = !!resp;
    }
  }

  let pdfUrl: string | null = null;
  if (c.type === "pdf" && c.file_path) {
    pdfUrl = supabase.storage.from("content-files").getPublicUrl(c.file_path).data.publicUrl;
  }

  return (
    <article>
      <div className="flex items-center gap-2 text-xs text-upm-muted">
        <span className="uppercase font-black text-upm-gold tracking-wider">{TYPE_LABEL[c.type] ?? c.type}</span>
        {c.category && <span>· {c.category}</span>}
      </div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h1 className="text-3xl sm:text-4xl font-black mt-2 tracking-tight">{c.title}</h1>
        {user && user.id === c.author_id && (quizzes.length > 0 || surveyQuestions.length > 0) && (
          <Link href={`/content/${c.id}/results`} className="btn-outline mt-2 text-sm px-4 py-2">
            📊 View results
          </Link>
        )}
      </div>
      {c.description && <p className="mt-3 text-upm-muted leading-relaxed">{c.description}</p>}

      {(c.type === "article" || c.type === "pdf") && (
        <div className="card mt-6 p-6 sm:p-8">
          {c.type === "article" && c.body ? (
            <Markdown>{c.body}</Markdown>
          ) : pdfUrl ? (
            <div>
              <iframe src={pdfUrl} className="w-full h-[600px] rounded-lg border border-upm-border bg-white" />
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                className="mt-4 inline-block font-bold text-upm-gold hover:underline">
                Open PDF in new tab ↗
              </a>
            </div>
          ) : (
            <p className="text-upm-muted">No content available.</p>
          )}
        </div>
      )}

      {user && (
        <ContentActions
          contentId={c.id}
          contentType={c.type}
          quizzes={quizzes}
          surveyQuestions={surveyQuestions}
          initiallyCompleted={completed}
          surveyDone={surveyDone}
        />
      )}
    </article>
  );
}
