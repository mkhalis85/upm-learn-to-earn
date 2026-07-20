import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Content, Quiz, SurveyQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

interface AnswerItem { question_id: string; question: string; answer: string }
interface ResponseRow { id: string; user_id: string; answers: AnswerItem[]; created_at: string }
interface AttemptRow { quiz_id: string; passed: boolean; user_id: string }

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contentRow } = await supabase
    .from("content").select("*").eq("id", id).single();
  if (!contentRow) notFound();
  const c = contentRow as Content;

  const { data: me } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  const isAuthor = c.author_id === user.id || me?.role === "admin";
  if (!isAuthor) redirect(`/content/${id}`);

  // ----- questionnaire data -----
  const { data: sqRows } = await supabase
    .from("survey_questions").select("*").eq("content_id", id).order("position");
  const surveyQuestions = (sqRows as SurveyQuestion[]) ?? [];

  const { data: respRows } = await supabase
    .from("survey_responses").select("*").eq("content_id", id).order("created_at");
  const responses = (respRows as ResponseRow[]) ?? [];

  const { data: nameRows } = await supabase
    .from("profiles").select("id, full_name")
    .in("id", responses.map((r) => r.user_id).concat(["00000000-0000-0000-0000-000000000000"]));
  const names = new Map((nameRows ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Anonymous"]));

  const answersFor = (qid: string) =>
    responses.map((r) => ({
      who: names.get(r.user_id) ?? "Learner",
      answer: (Array.isArray(r.answers) ? r.answers : []).find((a) => a.question_id === qid)?.answer ?? "",
    })).filter((a) => a.answer);

  // ----- quiz data -----
  const { data: quizRows } = await supabase
    .from("quizzes").select("*").eq("content_id", id).order("created_at");
  const quizzes = (quizRows as Quiz[]) ?? [];

  const { data: attemptRows } = await supabase
    .from("quiz_attempts").select("quiz_id, passed, user_id").eq("content_id", id);
  const attempts = (attemptRows as AttemptRow[]) ?? [];

  const quizStats = quizzes.map((q) => {
    const a = attempts.filter((x) => x.quiz_id === q.id);
    const learners = new Set(a.map((x) => x.user_id)).size;
    const passed = new Set(a.filter((x) => x.passed).map((x) => x.user_id)).size;
    return { q, attempts: a.length, learners, passed,
      rate: learners ? Math.round((passed / learners) * 100) : 0 };
  });

  return (
    <div>
      <Link href={`/content/${id}`} className="text-sm font-bold text-upm-gold hover:underline">← Back to content</Link>
      <h1 className="text-3xl font-black tracking-tight mt-2">
        Results — <span className="text-upm-gold">{c.title}</span>
      </h1>
      <p className="mt-1 text-sm text-upm-muted">Visible only to you as the author.</p>

      {surveyQuestions.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black">📋 Questionnaire responses</h2>
            <span className="chip bg-upm-light text-upm-gold">{responses.length} response{responses.length === 1 ? "" : "s"}</span>
          </div>

          {responses.length === 0 ? (
            <div className="card mt-4 p-8 text-center text-upm-muted">No responses yet — share the link with your learners.</div>
          ) : (
            <div className="mt-4 space-y-5">
              {surveyQuestions.map((q, i) => {
                const answers = answersFor(q.id);
                return (
                  <div key={q.id} className="card p-6">
                    <h3 className="font-bold">{i + 1}. {q.question}</h3>
                    {q.kind === "choice" && q.options ? (
                      <div className="mt-4 space-y-2">
                        {q.options.map((opt) => {
                          const count = answers.filter((a) => a.answer === opt).length;
                          const pct = answers.length ? Math.round((count / answers.length) * 100) : 0;
                          return (
                            <div key={opt}>
                              <div className="flex justify-between text-sm">
                                <span>{opt}</span>
                                <span className="font-bold text-upm-gold">{count} · {pct}%</span>
                              </div>
                              <div className="mt-1 h-2.5 rounded-full bg-upm-deep overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-upm-goldDark to-upm-gold"
                                  style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <ul className="mt-4 space-y-2">
                        {answers.map((a, ai) => (
                          <li key={ai} className="rounded-xl border border-upm-border bg-upm-deep px-4 py-2.5 text-sm">
                            <span className="font-semibold text-upm-muted">{a.who}:</span>{" "}
                            {a.answer}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}

              <div className="card p-6">
                <h3 className="font-bold mb-3">Respondents</h3>
                <ul className="flex flex-wrap gap-2">
                  {responses.map((r) => (
                    <li key={r.id} className="chip bg-upm-light text-upm-goldDark">
                      {names.get(r.user_id) ?? "Learner"} · {new Date(r.created_at).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      )}

      {quizzes.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-black">🎯 Quiz performance</h2>
          <div className="card mt-4 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-upm-deep text-xs uppercase tracking-wider text-upm-muted">
                <tr>
                  <th className="px-5 py-3">Question</th>
                  <th className="px-5 py-3 text-right">Attempts</th>
                  <th className="px-5 py-3 text-right">Learners</th>
                  <th className="px-5 py-3 text-right">Passed</th>
                  <th className="px-5 py-3 text-right">Pass rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-upm-border/60">
                {quizStats.map(({ q, attempts: at, learners, passed, rate }) => (
                  <tr key={q.id}>
                    <td className="px-5 py-3.5 font-medium">{q.question}</td>
                    <td className="px-5 py-3.5 text-right text-sm">{at}</td>
                    <td className="px-5 py-3.5 text-right text-sm">{learners}</td>
                    <td className="px-5 py-3.5 text-right text-sm">{passed}</td>
                    <td className={`px-5 py-3.5 text-right font-black ${rate >= 50 ? "text-upm-gold" : "text-red-600"}`}>
                      {rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {surveyQuestions.length === 0 && quizzes.length === 0 && (
        <div className="card mt-8 p-8 text-center text-upm-muted">
          This content has no quiz or questionnaire attached.
        </div>
      )}
    </div>
  );
}
