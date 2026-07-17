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
      setCompleted(true); // already completed
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
          <span className="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-green-800 font-medium">
            ✓ Completed
          </span>
        ) : (
          <button onClick={markComplete} disabled={busy}
            className="rounded-lg bg-upm px-6 py-2 text-white font-medium hover:bg-upm-dark disabled:opacity-50">
            {busy ? "Saving…" : "Mark complete (+10)"}
          </button>
        )}
      </div>

      {quiz && (
        <div className="rounded-xl border p-5 bg-white">
          <h3 className="font-semibold mb-3">Quiz — {quiz.question}</h3>
          <div className="space-y-2">
            {quiz.options.map((opt, i) => (
              <label key={i}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${
                  choice === i ? "border-upm bg-upm-light" : ""
                }`}>
                <input type="radio" name="quiz" checked={choice === i} onChange={() => setChoice(i)} />
                {opt}
              </label>
            ))}
          </div>
          <button onClick={submitQuiz} disabled={busy || choice === null}
            className="mt-4 rounded-lg bg-upm px-6 py-2 text-white font-medium hover:bg-upm-dark disabled:opacity-50">
            Submit answer
          </button>
          {result && (
            <p className={`mt-3 font-medium ${result === "pass" ? "text-green-700" : "text-red-600"}`}>
              {result === "pass" ? "✓ Correct" : "✗ Incorrect"}
            </p>
          )}
        </div>
      )}

      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  );
}
