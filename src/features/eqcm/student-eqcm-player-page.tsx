import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { apiGet, apiPost } from "../../services/api-client";
import { StudentDashboardLayout } from "../dashboard/student-dashboard-layout";

const STORAGE_KEY = "educonnect_auth";

type AuthUser = {
  id: string;
  email: string;
  role: "student" | "teacher";
};

type AuthState = {
  user: AuthUser;
  accessToken: string;
};

type Matiere = "Math" | "Physique" | "Sciences";

type EqcmPublishedDetails = {
  id: string;
  title: string;
  niveau: string;
  matiere: Matiere;
  chapitre: string;
  difficulte: "facile" | "moyen" | "difficile";
  correctionMode: "immediate";
  startsAt?: string;
  publishedAt?: string;
  questions: Array<{
    id: string;
    question: string;
    options: Array<{ key: "A" | "B" | "C" | "D"; text: string }>;
  }>;
};

type EqcmAttempt = {
  id: string;
  submittedAt?: string;
  correctionMode: "immediate";
  status: "graded";
  score?: number;
  totalQuestions?: number;
  correctCount?: number;
  percentage?: number;
  corrections?: Array<{
    questionId: string;
    selectedKey: "A" | "B" | "C" | "D";
    correctKey: "A" | "B" | "C" | "D";
    isCorrect: boolean;
    explanation: string;
  }>;
};

export function StudentEqcmPlayerPage() {
  const { t } = useTranslation();
  const { quizId } = useParams<{ quizId: string }>();

  const [auth, setAuth] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<EqcmPublishedDetails | null>(null);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D" | undefined>>({});
  const [submitResult, setSubmitResult] = useState<EqcmAttempt | null>(null);
  const [attempts, setAttempts] = useState<EqcmAttempt[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const isArabicQuiz = Boolean(
    selectedQuiz?.questions?.some((question) => /[\u0600-\u06FF]/.test(question.question)),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setAuth(JSON.parse(raw) as AuthState);
    } catch {
      setAuth(null);
    }
  }, []);

  useEffect(() => {
    if (!auth || auth.user.role !== "student" || !quizId) return;
    setLoading(true);
    setError(null);
    Promise.all([apiGet<EqcmPublishedDetails>(`/eqcm/${quizId}`), apiGet<EqcmAttempt[]>(`/eqcm/${quizId}/attempts/me`)])
      .then(([quizRes, attemptsRes]) => {
        if (quizRes.error || !quizRes.data) {
          setError(quizRes.error?.message ?? "Chargement du QCM impossible.");
          return;
        }
        setSelectedQuiz(quizRes.data);
        setAttempts(attemptsRes.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [auth?.user.id, auth?.user.role, quizId]);

  const selectAnswer = (questionId: string, key: "A" | "B" | "C" | "D") => {
    if (submitting) return;
    setAnswers((prev) => ({ ...prev, [questionId]: key }));
  };

  const submitQuiz = async () => {
    if (!selectedQuiz) return;
    const answersList = selectedQuiz.questions
      .map((question) => ({ questionId: question.id, selectedKey: answers[question.id] }))
      .filter((item): item is { questionId: string; selectedKey: "A" | "B" | "C" | "D" } => Boolean(item.selectedKey));
    if (answersList.length !== selectedQuiz.questions.length) {
      setError("Réponds à toutes les questions avant de soumettre.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const response = await apiPost<EqcmAttempt>(`/eqcm/${selectedQuiz.id}/submit`, { answers: answersList });
    setSubmitting(false);
    if (response.error || !response.data) {
      setError(response.error?.message ?? "Soumission impossible.");
      return;
    }
    setSubmitResult(response.data);
    const attemptsRes = await apiGet<EqcmAttempt[]>(`/eqcm/${selectedQuiz.id}/attempts/me`);
    setAttempts(attemptsRes.data ?? []);
  };

  if (!auth || auth.user.role !== "student") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">{t("studentPages.eqcmTitle")}</h1>
          <p>{t("auth.loginAsStudent")}</p>
          <Link className="btn btn-primary" to="/login">
            {t("auth.loginCta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <StudentDashboardLayout auth={auth}>
      <section className="dashboard-section">
        <h1>{t("studentPages.eqcmTitle")}</h1>
        {error ? <div className="auth-error">{error}</div> : null}
        <div className="row-actions" style={{ marginBottom: 12 }}>
          <Link className="btn btn-ghost" to="/dashboard/student/eqcm">
            Retour aux sélections
          </Link>
        </div>

        {loading ? <p>Chargement...</p> : null}
        {selectedQuiz ? (
          <div className={`dashboard-card eqcm-player${isArabicQuiz ? " eqcm-arabic" : ""}`}>
            <div className="dashboard-header">
              <div>
                <h2>{selectedQuiz.title}</h2>
                <p>
                  {selectedQuiz.niveau} • {selectedQuiz.matiere} • {selectedQuiz.chapitre}
                </p>
              </div>
              <span className="status">{selectedQuiz.questions.length} questions</span>
            </div>

            <div className="eqcm-progress">
              <span>
                {isArabicQuiz
                  ? `السؤال ${currentQuestionIndex + 1} / ${selectedQuiz.questions.length}`
                  : `Question ${currentQuestionIndex + 1}/${selectedQuiz.questions.length}`}
              </span>
            </div>

            {selectedQuiz.questions[currentQuestionIndex] ? (
              <div className="eqcm-question-list">
                {(() => {
                  const question = selectedQuiz.questions[currentQuestionIndex];
                  const selected = answers[question.id];
                  return (
                    <article key={question.id} className="eqcm-question-card">
                      <div className="eqcm-question-card__inner">
                        <div className="eqcm-question-card__face eqcm-question-card__face--front">
                          <strong>
                            {isArabicQuiz
                              ? `س${currentQuestionIndex + 1}. ${question.question}`
                              : `Q${currentQuestionIndex + 1}. ${question.question}`}
                          </strong>
                          <div className="eqcm-options">
                            {question.options.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                className={`eqcm-option${selected === option.key ? " is-selected" : ""}`}
                                onClick={() => selectAnswer(question.id, option.key)}
                                disabled={Boolean(submitResult)}
                              >
                                <span>{option.key}</span>
                                <span>{option.text}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })()}
              </div>
            ) : null}

            <div className="row-actions" style={{ marginTop: 14 }}>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                {isArabicQuiz ? "السابق" : "Précédent"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => setCurrentQuestionIndex((prev) => Math.min(selectedQuiz.questions.length - 1, prev + 1))}
                disabled={currentQuestionIndex >= selectedQuiz.questions.length - 1}
              >
                {isArabicQuiz ? "التالي" : "Suivant"}
              </button>
              <button className="btn btn-primary" type="button" onClick={() => void submitQuiz()} disabled={submitting || Boolean(submitResult)}>
                {submitting ? (isArabicQuiz ? "جار الإرسال..." : "Soumission...") : isArabicQuiz ? "إنهاء الاختبار" : "Soumettre"}
              </button>
            </div>

            {submitResult ? (
              <div className="eqcm-result-card">
                <strong>
                  {isArabicQuiz
                    ? `النتيجة: ${submitResult.score}/${submitResult.totalQuestions} (${submitResult.percentage}%)`
                    : `Note: ${submitResult.score}/${submitResult.totalQuestions} (${submitResult.percentage}%)`}
                </strong>
                <p>{isArabicQuiz ? "التصحيح الكامل:" : "Correction complète du quiz:"}</p>
                <div className="eqcm-corrections">
                  {(submitResult.corrections ?? []).map((correction, index) => {
                    const questionText =
                      selectedQuiz.questions.find((question) => question.id === correction.questionId)?.question ??
                      (isArabicQuiz ? `السؤال ${index + 1}` : `Question ${index + 1}`);
                    return (
                      <article key={correction.questionId} className="eqcm-correction-item">
                        <strong>
                          {isArabicQuiz ? `س${index + 1}. ${questionText}` : `Q${index + 1}. ${questionText}`}
                        </strong>
                        <p className={correction.isCorrect ? "eqcm-correction-ok" : "eqcm-correction-ko"}>
                          {correction.isCorrect
                            ? (isArabicQuiz ? "إجابة صحيحة" : "Bonne réponse")
                            : (isArabicQuiz ? "إجابة غير صحيحة" : "Réponse incorrecte")}
                        </p>
                        <p>
                          {isArabicQuiz
                            ? `إجابتك: ${correction.selectedKey} • الصحيحة: ${correction.correctKey}`
                            : `Ton choix: ${correction.selectedKey} • Correct: ${correction.correctKey}`}
                        </p>
                        <p>{correction.explanation}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="eqcm-attempts">
              <h3>{isArabicQuiz ? "المحاولات" : "Tentatives"}</h3>
              <div className="dashboard-list">
                {attempts.length === 0 ? (
                  <div className="dashboard-row">
                    <div>
                      <strong>{isArabicQuiz ? "لا توجد محاولات" : "Aucune tentative"}</strong>
                    </div>
                  </div>
                ) : (
                  attempts.map((attempt) => (
                    <div key={attempt.id} className="dashboard-row">
                      <div>
                        <strong>{formatDate(attempt.submittedAt)}</strong>
                        <p>
                          {isArabicQuiz
                            ? `النتيجة ${attempt.score}/${attempt.totalQuestions} (${attempt.percentage}%)`
                            : `Note ${attempt.score}/${attempt.totalQuestions} (${attempt.percentage}%)`}
                        </p>
                      </div>
                      <span className="status">{isArabicQuiz ? "تم التصحيح" : "Corrigé"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </StudentDashboardLayout>
  );
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("fr-FR");
}
