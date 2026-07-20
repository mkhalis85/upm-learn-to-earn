"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { Role } from "@/lib/types";

type CType = "article" | "pdf" | "quiz" | "questionnaire";
type QuizQ = { question: string; options: string[]; correct: number };
type SurveyQ = { question: string; kind: "text" | "choice"; options: string[] };

const TYPE_TABS: { key: CType; label: string; hint: string }[] = [
  { key: "article", label: "📝 Article", hint: "Write a markdown lesson" },
  { key: "pdf", label: "📄 PDF", hint: "Upload notes or slides" },
  { key: "quiz", label: "🎯 Quiz", hint: "Multi-question, +25/question on first pass" },
  { key: "questionnaire", label: "📋 Questionnaire", hint: "Survey — students earn +15 for responding" },
];

export default function UploadPage() {
  const supabase = createClient();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [type, setType] = useState<CType>("article");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Physics");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // article/pdf optional single quiz (legacy behaviour)
  const [addQuiz, setAddQuiz] = useState(false);

  const [quizQs, setQuizQs] = useState<QuizQ[]>([{ question: "", options: ["", "", "", ""], correct: 0 }]);
  const [surveyQs, setSurveyQs] = useState<SurveyQ[]>([{ question: "", kind: "text", options: [] }]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setRole((data?.role as Role) ?? "student");
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (role && role === "student") {
    return (
      <div className="max-w-lg mx-auto mt-8 text-center">
        <h1 className="text-2xl font-black mb-2">Upload</h1>
        <p className="text-upm-muted">
          Creating content is available to educators and admins. Ask an admin to
          upgrade your role, or keep learning to earn points.
        </p>
      </div>
    );
  }

  const cleanQuiz = () =>
    quizQs
      .map((q) => ({ ...q, options: q.options.map((o) => o.trim()).filter(Boolean) }))
      .filter((q) => q.question.trim() && q.options.length >= 2);

  const cleanSurvey = () =>
    surveyQs
      .map((q) => ({ ...q, options: q.options.map((o) => o.trim()).filter(Boolean) }))
      .filter((q) => q.question.trim() && (q.kind === "text" || q.options.length >= 2));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId) return;

    if (type === "quiz" && cleanQuiz().length === 0) {
      setError("Add at least one question with two or more options."); return;
    }
    if (type === "questionnaire" && cleanSurvey().length === 0) {
      setError("Add at least one question (choice questions need two options)."); return;
    }

    setLoading(true);
    try {
      let filePath: string | null = null;
      if (type === "pdf") {
        if (!file) throw new Error("Please choose a PDF file.");
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("content-files").upload(path, file);
        if (upErr) throw upErr;
        filePath = path;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("content")
        .insert({
          title, description, type, category,
          body: type === "article" ? body : null,
          file_path: filePath,
          author_id: userId,
          status: "approved",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      const contentId = inserted!.id;

      if (type === "quiz" || (addQuiz && (type === "article" || type === "pdf"))) {
        const rows = cleanQuiz().map((q) => ({
          content_id: contentId, question: q.question,
          options: q.options, correct_index: Math.min(q.correct, q.options.length - 1),
        }));
        if (rows.length) {
          const { error: qErr } = await supabase.from("quizzes").insert(rows);
          if (qErr) throw qErr;
        }
      }

      if (type === "questionnaire") {
        const rows = cleanSurvey().map((q, i) => ({
          content_id: contentId, question: q.question, kind: q.kind,
          options: q.kind === "choice" ? q.options : null, position: i,
        }));
        const { error: sErr } = await supabase.from("survey_questions").insert(rows);
        if (sErr) throw sErr;
      }

      router.push(`/content/${contentId}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black tracking-tight mb-1">Create <span className="text-upm-gold">content</span></h1>
      <p className="text-sm text-upm-muted mb-6">Lessons, quizzes, and questionnaires all reward your learners.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {TYPE_TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setType(t.key)}
            className={`rounded-xl border-2 p-3 text-left transition-all ${
              type === t.key ? "border-upm-gold bg-upm-light" : "border-upm-border bg-white hover:border-upm-gold/40"
            }`}>
            <div className="font-bold text-sm">{t.label}</div>
            <div className="mt-0.5 text-[11px] leading-tight text-upm-muted">{t.hint}</div>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <input required placeholder="Title" value={title}
          onChange={(e) => setTitle(e.target.value)} className="input" />
        <input placeholder="Short description" value={description}
          onChange={(e) => setDescription(e.target.value)} className="input" />
        <input placeholder="Category (e.g. Physics, Astronomy)" value={category}
          onChange={(e) => setCategory(e.target.value)} className="input" />

        {type === "article" && (
          <textarea required placeholder="Write your lesson in markdown…" value={body}
            onChange={(e) => setBody(e.target.value)} rows={10}
            className="input font-mono text-sm" />
        )}
        {type === "pdf" && (
          <input type="file" accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input" />
        )}

        {(type === "article" || type === "pdf") && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={addQuiz} onChange={(e) => setAddQuiz(e.target.checked)} />
            Attach quiz questions (+25 each on first pass)
          </label>
        )}

        {(type === "quiz" || addQuiz) && (
          <div className="space-y-3">
            {quizQs.map((q, qi) => (
              <div key={qi} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="chip bg-upm-light text-upm-gold">Question {qi + 1}</span>
                  {quizQs.length > 1 && (
                    <button type="button" className="text-xs text-red-600 font-semibold"
                      onClick={() => setQuizQs(quizQs.filter((_, i) => i !== qi))}>Remove</button>
                  )}
                </div>
                <input placeholder="Question" value={q.question}
                  onChange={(e) => { const n = [...quizQs]; n[qi] = { ...q, question: e.target.value }; setQuizQs(n); }}
                  className="input" />
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${qi}`} checked={q.correct === oi}
                      onChange={() => { const n = [...quizQs]; n[qi] = { ...q, correct: oi }; setQuizQs(n); }}
                      className="accent-[#ae0435]" />
                    <input placeholder={`Option ${oi + 1}`} value={o}
                      onChange={(e) => { const n = [...quizQs]; const opts = [...q.options]; opts[oi] = e.target.value; n[qi] = { ...q, options: opts }; setQuizQs(n); }}
                      className="input flex-1" />
                  </div>
                ))}
                <p className="text-xs text-upm-muted">Select the radio next to the correct answer.</p>
              </div>
            ))}
            <button type="button" className="btn-outline w-full"
              onClick={() => setQuizQs([...quizQs, { question: "", options: ["", "", "", ""], correct: 0 }])}>
              + Add question
            </button>
          </div>
        )}

        {type === "questionnaire" && (
          <div className="space-y-3">
            {surveyQs.map((q, qi) => (
              <div key={qi} className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="chip bg-upm-light text-upm-gold">Question {qi + 1}</span>
                  {surveyQs.length > 1 && (
                    <button type="button" className="text-xs text-red-600 font-semibold"
                      onClick={() => setSurveyQs(surveyQs.filter((_, i) => i !== qi))}>Remove</button>
                  )}
                </div>
                <input placeholder="Question" value={q.question}
                  onChange={(e) => { const n = [...surveyQs]; n[qi] = { ...q, question: e.target.value }; setSurveyQs(n); }}
                  className="input" />
                <select value={q.kind}
                  onChange={(e) => { const n = [...surveyQs]; n[qi] = { ...q, kind: e.target.value as "text" | "choice", options: e.target.value === "choice" ? ["", ""] : [] }; setSurveyQs(n); }}
                  className="input w-auto">
                  <option value="text">Short answer</option>
                  <option value="choice">Multiple choice</option>
                </select>
                {q.kind === "choice" && (
                  <div className="space-y-2">
                    {q.options.map((o, oi) => (
                      <input key={oi} placeholder={`Option ${oi + 1}`} value={o}
                        onChange={(e) => { const n = [...surveyQs]; const opts = [...q.options]; opts[oi] = e.target.value; n[qi] = { ...q, options: opts }; setSurveyQs(n); }}
                        className="input" />
                    ))}
                    <button type="button" className="text-xs font-bold text-upm-gold"
                      onClick={() => { const n = [...surveyQs]; n[qi] = { ...q, options: [...q.options, ""] }; setSurveyQs(n); }}>
                      + Add option
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button type="button" className="btn-outline w-full"
              onClick={() => setSurveyQs([...surveyQs, { question: "", kind: "text", options: [] }])}>
              + Add question
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="btn-primary">
          {loading ? "Publishing…" : "Publish"}
        </button>
      </form>
    </div>
  );
}
