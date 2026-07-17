"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { Role } from "@/lib/types";

export default function UploadPage() {
  const supabase = createClient();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [type, setType] = useState<"article" | "pdf">("article");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Physics");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [addQuiz, setAddQuiz] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);

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
          Uploading is available to educators and admins. Ask an admin to upgrade
          your role, or keep learning to earn points.
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!userId) return;
    setLoading(true);
    try {
      let filePath: string | null = null;
      if (type === "pdf") {
        if (!file) throw new Error("Please choose a PDF file.");
        const path = `${userId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("content-files").upload(path, file);
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

      if (addQuiz && inserted) {
        const clean = options.map((o) => o.trim()).filter(Boolean);
        if (!question.trim() || clean.length < 2) {
          throw new Error("A quiz needs a question and at least two options.");
        }
        const { error: qErr } = await supabase.from("quizzes").insert({
          content_id: inserted.id,
          question,
          options: clean,
          correct_index: correct,
        });
        if (qErr) throw qErr;
      }

      router.push(`/content/${inserted!.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-black tracking-tight mb-1">Upload <span className="text-upm-gold">content</span></h1>
      <p className="text-sm text-upm-muted mb-6">Approved uploads earn you points.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input type="radio" checked={type === "article"} onChange={() => setType("article")} />
            Article (markdown)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={type === "pdf"} onChange={() => setType("pdf")} />
            PDF upload
          </label>
        </div>

        <input required placeholder="Title" value={title}
          onChange={(e) => setTitle(e.target.value)} className="input" />
        <input placeholder="Short description" value={description}
          onChange={(e) => setDescription(e.target.value)} className="input" />
        <input placeholder="Category (e.g. Physics, Astronomy)" value={category}
          onChange={(e) => setCategory(e.target.value)} className="input" />

        {type === "article" ? (
          <textarea required placeholder="Write your lesson in markdown…" value={body}
            onChange={(e) => setBody(e.target.value)} rows={10}
            className="input font-mono text-sm" />
        ) : (
          <input type="file" accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="input" />
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={addQuiz} onChange={(e) => setAddQuiz(e.target.checked)} />
          Attach a one-question quiz (learners earn points for passing)
        </label>

        {addQuiz && (
          <div className="card p-4 space-y-3">
            <input placeholder="Question" value={question}
              onChange={(e) => setQuestion(e.target.value)} className="input" />
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correct === i} onChange={() => setCorrect(i)} />
                <input placeholder={`Option ${i + 1}`} value={o}
                  onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }}
                  className="input flex-1" />
              </div>
            ))}
            <p className="text-xs text-upm-muted">Select the radio next to the correct answer.</p>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button disabled={loading}
          className="btn-primary">
          {loading ? "Publishing…" : "Publish"}
        </button>
      </form>
    </div>
  );
}
