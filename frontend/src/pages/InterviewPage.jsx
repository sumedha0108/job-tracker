import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

export default function InterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);

  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState([]);

  const [finalFeedback, setFinalFeedback] = useState(null);

  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  // -----------------------------
  // 🔊 TEXT TO SPEECH
  // -----------------------------
  const speak = (text) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  // -----------------------------
  // 🎤 SPEECH TO TEXT
  // -----------------------------
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let silenceTimer;

    const resetSilenceTimer = () => {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        recognition.stop();
      }, 4000);
    };

    setListening(true);

    recognition.onresult = (event) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setAnswer((prev) => prev + " " + finalTranscript);
      }

      resetSilenceTimer();
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      setListening(false);
      clearTimeout(silenceTimer);
    };

    recognition.onend = () => {
      setListening(false);
      clearTimeout(silenceTimer);
    };

    recognition.start();
    resetSilenceTimer();
  };

  // -----------------------------
  // 🎯 FETCH QUESTIONS
  // -----------------------------
  const startInterview = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `/api/interview/start?job_id=${id}`
      );
      const cleaned = (res.data.questions || []).filter((q) =>
        q.match(/^\d+\./)
      );
      setQuestions(cleaned);
      setCurrentQ(0);
      setAnswers([]);
      setAnswer("");
      setFinalFeedback(null);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // -----------------------------
  // ➡️ NEXT QUESTION
  // -----------------------------
  const handleNext = () => {
    if (!answer) return;
    setAnswers((prev) => [
      ...prev,
      { question: questions[currentQ], answer: answer },
    ]);
    setAnswer("");
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
    }
  };

  // -----------------------------
  // 🏁 FINISH INTERVIEW
  // -----------------------------
  const finishInterview = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`/api/interview/evaluate`, {
        responses: [
          ...answers,
          { question: questions[currentQ], answer: answer },
        ],
      });
      setFinalFeedback(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // -----------------------------
  // 🔊 AUTO SPEAK
  // -----------------------------
  useEffect(() => {
    if (questions.length > 0 && currentQ < questions.length) {
      speak(questions[currentQ]);
    }
  }, [currentQ, questions]);

  const progressPct =
    questions.length > 0
      ? Math.round(((currentQ + 1) / questions.length) * 100)
      : 0;

  const isLastQ = currentQ === questions.length - 1;

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div
      style={{ fontFamily: "'DM Sans', sans-serif" }}
      className="min-h-screen bg-[#0f0f13] text-white"
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div className="border-b border-white/10 px-8 py-5 flex items-center gap-4">
        <button
          onClick={() => navigate(`/jobs/${id}`)}
          className="text-white/30 hover:text-white transition text-sm"
        >
          ← Back
        </button>
        <div>
          <h1
            style={{ fontFamily: "'Syne', sans-serif" }}
            className="text-xl font-extrabold"
          >
            Mock Interview
          </h1>
          <p className="text-xs text-white/40">AI-powered practice session</p>
        </div>
      </div>

      <div className="px-8 py-8 max-w-2xl mx-auto space-y-4">

        {/* ── START STATE ── */}
        {questions.length === 0 && !loading && (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-2xl mx-auto mb-5">
                🎤
              </div>
              <h2
                style={{ fontFamily: "'Syne', sans-serif" }}
                className="text-lg font-extrabold mb-2"
              >
                Ready to practice?
              </h2>
              <p className="text-sm text-white/40 max-w-sm mx-auto mb-6 leading-relaxed">
                We'll generate role-specific questions from your resume and job
                description, then evaluate your answers with AI feedback.
              </p>
              <button
                onClick={startInterview}
                className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-all"
              >
                Start Interview
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: "📋", text: "Questions tailored to your JD & resume" },
                { icon: "🔊", text: "Voice answers with auto-silence detection" },
                { icon: "📊", text: "Score, strengths & detailed AI feedback" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center"
                >
                  <div className="text-xl mb-2">{icon}</div>
                  <p className="text-xs text-white/40 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── LOADING QUESTIONS ── */}
        {loading && questions.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-white/40">Generating your questions...</p>
          </div>
        )}

        {/* ── INTERVIEW STATE ── */}
        {questions.length > 0 && !finalFeedback && (
          <>
            {/* Progress */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-white/30 whitespace-nowrap">
                {currentQ + 1} / {questions.length}
              </span>
            </div>

            {/* Question card */}
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
              <p className="text-xs text-indigo-300/60 uppercase tracking-wider mb-3">
                Question {currentQ + 1}
              </p>
              <p className="text-base leading-relaxed text-white/90">
                {questions[currentQ]}
              </p>
            </div>

            {/* Controls */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => speak(questions[currentQ])}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm font-medium rounded-xl transition-all"
              >
                <span>🔊</span> Repeat question
              </button>

              <button
                onClick={startListening}
                disabled={listening}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
                  listening
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 cursor-not-allowed"
                    : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full bg-emerald-400 ${
                    listening ? "animate-pulse" : ""
                  }`}
                />
                {listening ? "Listening..." : "Speak answer"}
              </button>
            </div>

            {/* Answer display */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-3">
                Your answer
              </p>
              {answer ? (
                <p className="text-sm text-white/75 leading-relaxed">{answer}</p>
              ) : (
                <p className="text-sm text-white/20 italic">
                  {listening
                    ? "Listening for your answer..."
                    : 'Click "Speak answer" to start recording...'}
                </p>
              )}
            </div>

            {/* Nav */}
            <div className="flex gap-3 items-center">
              {isLastQ ? (
                <button
                  onClick={finishInterview}
                  disabled={!answer || loading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-sm font-medium rounded-xl transition-all"
                >
                  {loading ? "Evaluating..." : "Finish & Evaluate →"}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!answer}
                  className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-30 text-white text-sm font-medium rounded-xl transition-all"
                >
                  Next question →
                </button>
              )}
              {!answer && (
                <span className="text-xs text-white/20">
                  Answer to continue
                </span>
              )}
            </div>
          </>
        )}

        {/* ── EVALUATING ── */}
        {loading && finalFeedback === null && questions.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm text-white/40">Evaluating your performance...</p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {finalFeedback && (
          <>
            {/* Score */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-4">
                Interview Results
              </p>
              <p
                style={{ fontFamily: "'Syne', sans-serif" }}
                className="text-6xl font-extrabold text-indigo-400 leading-none"
              >
                {finalFeedback.score}
              </p>
              <p className="text-sm text-white/30 mt-1">out of 10</p>
            </div>

            {/* Communication */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-xs text-indigo-300/70 uppercase tracking-wider mb-2">
                Communication
              </p>
              <p className="text-sm text-white/70 leading-relaxed">
                {finalFeedback.communication}
              </p>
            </div>

            {/* Technical */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-xs text-indigo-300/70 uppercase tracking-wider mb-2">
                Technical
              </p>
              <p className="text-sm text-white/70 leading-relaxed">
                {finalFeedback.technical}
              </p>
            </div>

            {/* Strengths */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-xs text-emerald-400/80 uppercase tracking-wider mb-3">
                Strengths
              </p>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(finalFeedback.strengths)
                  ? finalFeedback.strengths
                  : [finalFeedback.strengths]
                ).map((s, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-xs text-red-400/80 uppercase tracking-wider mb-3">
                Weaknesses
              </p>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(finalFeedback.weaknesses)
                  ? finalFeedback.weaknesses
                  : [finalFeedback.weaknesses]
                ).map((w, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>

            {/* Suggestions */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <p className="text-xs text-indigo-300/70 uppercase tracking-wider mb-3">
                Suggestions
              </p>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(finalFeedback.suggestions)
                  ? finalFeedback.suggestions
                  : [finalFeedback.suggestions]
                ).map((s, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={startInterview}
                className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium rounded-xl transition-all"
              >
                Try again
              </button>
              <button
                onClick={() => navigate(`/jobs/${id}`)}
                className="px-5 py-2.5 border border-white/10 text-white/50 hover:text-white text-sm font-medium rounded-xl transition-all"
              >
                ← Back to job
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}