import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { api } from '../lib/api'

/**
 * Generic "generate (or fetch) a short quiz, take it, show the result" modal.
 * generateEndpoint: path (e.g. `/skills/${name}/quiz`) that returns { quiz }
 * generateBody: optional body sent with the generation request (POST mode only)
 * method: 'post' (default) generates a fresh quiz each load; 'get' fetches an
 *   already-generated quiz (e.g. one produced during document upload processing)
 * onResult(res): called with the full attempt response after grading
 */
export default function QuizModal({ title, generateEndpoint, generateBody, method = 'post', onClose, onResult }) {
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function load() {
    setLoading(true)
    setError('')
    const request =
      method === 'get'
        ? api.get(generateEndpoint)
        : api.post(generateEndpoint, generateBody)
    request
      .then((res) => setQuiz(res.quiz))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    setSubmitting(true)
    try {
      const payload = quiz.questions.map((q) => ({ questionId: q._id, given: answers[q._id] || '' }))
      const res = await api.post(`/quizzes/${quiz._id}/attempt`, { answers: payload })
      setResult(res)
      onResult?.(res)
    } catch (err) {
      setError(err.message || 'Unable to submit the quiz. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function retake() {
    setResult(null)
    setAnswers({})
    setQuiz(null)
    load()
  }

  return (
    <Modal open onClose={onClose} title={title} className="max-w-lg">
      {loading && <p className="text-sm text-ink-faint">Generating a quick check…</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}

      {quiz && !result && (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-none pr-1">
          {quiz.questions.map((q, i) => (
            <div key={q._id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
              <p className="text-sm text-white mb-2.5">{i + 1}. {q.prompt}</p>
              <div className="flex flex-wrap gap-2">
                {(q.options || []).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswers((a) => ({ ...a, [q._id]: opt }))}
                    className={`text-xs px-3 py-1.5 rounded-full border ${answers[q._id] === opt ? 'border-violet-400/50 bg-violet-500/10 text-white' : 'border-white/10 text-ink-faint hover:border-white/20'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Button onClick={submit} disabled={submitting} className="w-full">{submitting ? 'Grading…' : 'Submit'}</Button>
        </div>
      )}

      {result && (
        <div className="py-2">
          <div className="text-center mb-4">
            {result.attempt.score >= 60 ? (
              <Check size={32} className="text-emerald-400 mx-auto mb-3" />
            ) : (
              <X size={32} className="text-red-400 mx-auto mb-3" />
            )}
            <p className="text-white font-medium">{result.attempt.score}% score</p>
          </div>
          <div className="space-y-2.5 max-h-60 overflow-y-auto scrollbar-none pr-1">
            {result.review.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {r.correct ? <Check size={13} className="text-emerald-400 mt-0.5 shrink-0" /> : <X size={13} className="text-red-400 mt-0.5 shrink-0" />}
                <div className="flex-1">
                  <p className="text-ink-dim">{i + 1}. {r.prompt}</p>
                  <p className="text-ink-faint mt-0.5">Your answer: {r.given || '(no answer)'}</p>
                  {!r.correct && <p className="text-emerald-300/80 mt-0.5">Correct answer: {r.correctAnswer}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            {result.attempt.score < 60 && <Button size="sm" onClick={retake} className="flex-1">Retake</Button>}
            <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">Close</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
