"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { Quiz } from "@/lib/types";

export default function ContentActions({
  contentId,
  quiz,
  initiallyCompleted,
}: {
  contentId: string;
  quiz: Quiz | null;
  initiallyCompleted: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<null | "pass" | "fail">(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function markComplete() {
    setBusy(true);
    const { error } = await supabase
      .from("content_completions")
      .insert({ content_id: contentId, user_id: (await supabase.auth.getUser()).data.user!.id });
    setBusy(false);
    if (!error) {
      setCompleted(true);
      setMsg("Nice! +10 points for completing this.");
      router.refresh();
    } else if (error.code === "23505") {
      setCompleted(true);
    } else {
      setMsg(error.message);
    }
  }

  async function submitQuiz() {
    if (choice === null || !quiz) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_quiz", {
      p_quiz: quiz.id,
      p_choice: choice,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    const passed = data as boolean;
    setResult(passed ? "pass" : "fail");
    setMsg(passed ? "Correct! Points awarded (first pass only)." : "Not quite — try again.");
    router.refresh();
  }

  return (
    <div className="mt-8 space-y-6">
      <div>
        {completed ? (
          <span className="inline-flex items-center gap-2 rounded-xl border border-upm-gold/50 bg-upm-gold/10 px-5 py-2.5 font-bold text-upm-gold">
            ✓ Completed
          </span>
        ) : (
          <button onClick={markComplete} disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Mark complete (+10)"}
          </button>
        )}
      </div>

      {quiz && (
        <div className="card p-6">
          <h3 className="font-bold mb-4 text-upm-text">
            <span className="text-upm-gold">Quiz</span> — {quiz.question}
          </h3>
          <div className="space-y-2">
            {quiz.options.map((opt, i) => (
              <label key={i}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  choice === i
                    ? "border-upm-gold bg-upm-gold/10 text-upm-text"
                    : "border-upm-border hover:border-upm-gold/50 text-upm-muted hover:text-upm-text"
                }`}>
                <input type="radio" name="quiz" checked={choice === i} onChange={() => setChoice(i)}
                  className="accent-[#ae0435]" />
                {opt}
              </label>
            ))}
          </div>
          <button onClick={submitQuiz} disabled={busy || choice === null} className="btn-primary mt-5">
            Submit answer
          </button>
          {result && (
            <p className={`mt-4 font-bold ${result === "pass" ? "text-upm-gold" : "text-red-600"}`}>
              {result === "pass" ? "✓ Correct" : "✗ Incorrect"}
            </p>
          )}
        </div>
      )}

      {msg && <p className="text-sm text-upm-muted">{msg}</p>}
    </div>
  );
}
