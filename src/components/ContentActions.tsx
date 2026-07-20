"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import type { Quiz, SurveyQuestion, ContentType } from "@/lib/types";

export default function ContentActions({
  contentId,
  contentType,
  quizzes,
  surveyQuestions,
  initiallyCompleted,
  surveyDone,
}: {
  contentId: string;
  contentType: ContentType;
  quizzes: Quiz[];
  surveyQuestions: SurveyQuestion[];
  initiallyCompleted: boolean;
  surveyDone: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // per-question quiz state
  const [choices, setChoices] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, "pass" | "fail">>({});

  // survey state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [surveySubmitted, setSurveySubmitted] = useState(surveyDone);

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

  async function submitQuiz(quiz: Quiz) {
    const choice = choices[quiz.id];
    if (choice === undefined) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_quiz", { p_quiz: quiz.id, p_choice: choice });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    const passed = data as boolean;
    setResults({ ...results, [quiz.id]: passed ? "pass" : "fail" });
    setMsg(passed ? "Correct! Points awarded (first pass only)." : "Not quite — try again.");
    router.refresh();
  }

  async function submitSurvey() {
    const missing = surveyQuestions.filter((q) => !answers[q.id]?.trim());
    if (missing.length) { setMsg("Please answer every question before submitting."); return; }
    setBusy(true);
    const payload = surveyQuestions.map((q) => ({ question_id: q.id, question: q.question, answer: answers[q.id] }));
    const { data, error } = await supabase.rpc("submit_survey", {
      p_content: contentId, p_answers: payload,
    });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setSurveySubmitted(true);
    setMsg(data ? "Thank you! +15 points for responding." : "Already submitted — thank you!");
    router.refresh();
  }

  const showMarkComplete = contentType === "article" || contentType === "pdf";

  return (
    <div className="mt-8 space-y-6">
      {showMarkComplete && (
        <div>
          {completed ? (
            <span className="inline-flex items-center gap-2 rounded-xl border border-upm-gold/50 bg-upm-light px-5 py-2.5 font-bold text-upm-gold">
              ✓ Completed
            </span>
          ) : (
            <button onClick={markComplete} disabled={busy} className="btn-primary">
              {busy ? "Saving…" : "Mark complete (+10)"}
            </button>
          )}
        </div>
      )}

      {quizzes.map((quiz, i) => (
        <div key={quiz.id} className="card p-6">
          <h3 className="font-bold mb-4">
            <span className="text-upm-gold">Question {i + 1}</span> — {quiz.question}
          </h3>
          <div className="space-y-2">
            {quiz.options.map((opt, oi) => (
              <label key={oi}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  choices[quiz.id] === oi
                    ? "border-upm-gold bg-upm-light"
                    : "border-upm-border hover:border-upm-gold/50 text-upm-muted hover:text-upm-text"
                }`}>
                <input type="radio" name={`quiz-${quiz.id}`} checked={choices[quiz.id] === oi}
                  onChange={() => setChoices({ ...choices, [quiz.id]: oi })}
                  className="accent-[#ae0435]" />
                {opt}
              </label>
            ))}
          </div>
          <button onClick={() => submitQuiz(quiz)} disabled={busy || choices[quiz.id] === undefined}
            className="btn-primary mt-4">
            Submit answer
          </button>
          {results[quiz.id] && (
            <p className={`mt-3 font-bold ${results[quiz.id] === "pass" ? "text-upm-gold" : "text-red-600"}`}>
              {results[quiz.id] === "pass" ? "✓ Correct" : "✗ Incorrect"}
            </p>
          )}
        </div>
      ))}

      {surveyQuestions.length > 0 && (
        <div className="card p-6">
          <h3 className="font-black text-lg mb-1">
            <span className="text-upm-gold">Questionnaire</span>
          </h3>
          <p className="text-sm text-upm-muted mb-5">Answer all questions to earn +15 points. One submission per learner.</p>
          {surveySubmitted ? (
            <span className="inline-flex items-center gap-2 rounded-xl border border-upm-gold/50 bg-upm-light px-5 py-2.5 font-bold text-upm-gold">
              ✓ Response recorded — thank you!
            </span>
          ) : (
            <div className="space-y-5">
              {surveyQuestions.map((q, i) => (
                <div key={q.id}>
                  <label className="font-semibold text-sm">{i + 1}. {q.question}</label>
                  {q.kind === "choice" && q.options ? (
                    <div className="mt-2 space-y-2">
                      {q.options.map((opt, oi) => (
                        <label key={oi}
                          className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors ${
                            answers[q.id] === opt
                              ? "border-upm-gold bg-upm-light"
                              : "border-upm-border hover:border-upm-gold/50 text-upm-muted"
                          }`}>
                          <input type="radio" name={`sq-${q.id}`} checked={answers[q.id] === opt}
                            onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                            className="accent-[#ae0435]" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea rows={2} placeholder="Your answer…" value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      className="input mt-2" />
                  )}
                </div>
              ))}
              <button onClick={submitSurvey} disabled={busy} className="btn-primary">
                {busy ? "Submitting…" : "Submit questionnaire (+15)"}
              </button>
            </div>
          )}
        </div>
      )}

      {msg && <p className="text-sm text-upm-muted">{msg}</p>}
    </div>
  );
}
