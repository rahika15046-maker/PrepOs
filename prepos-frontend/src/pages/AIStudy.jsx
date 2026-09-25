import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  AlertCircle,
  FileText,
  Loader2,
  Upload,
} from 'lucide-react'
import { api } from '../lib/api'
import QuizModal from '../components/QuizModal'

const ACCEPTED_FILES =
  '.pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg,.webp'

function getErrorMessage(error) {
  return (
    error?.message ||
    'Something went wrong. Please try again.'
  )
}

export default function AIStudy() {
  const [
    documents,
    setDocuments,
  ] = useState([])

  const [
    document,
    setDocument,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    loadingDocuments,
    setLoadingDocuments,
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState('')

  const [
    actionError,
    setActionError,
  ] = useState('')

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false)

  const loadDocuments =
    useCallback(
      async () => {
        setLoadingDocuments(true)
        setError('')

        try {
          const result =
            await api.get(
              '/documents'
            )

          setDocuments(
            result.documents || []
          )
        } catch (error) {
          setError(
            getErrorMessage(error)
          )
        } finally {
          setLoadingDocuments(false)
        }
      },
      []
    )

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const uploadDocument =
    async (event) => {
      const file =
        event.target.files?.[0]

      if (!file) return

      setLoading(true)
      setError('')
      setActionError('')

      try {
        const formData =
          new FormData()

        formData.append(
          'file',
          file
        )

        const result =
          await api.post(
            '/documents/upload',
            formData,
            {
              isForm: true,
            }
          )

        setDocument(
          result.document
        )

        await loadDocuments()
      } catch (error) {
        setError(
          getErrorMessage(error)
        )
      } finally {
        setLoading(false)

        event.target.value = ''
      }
    }

  const selectDocument =
    async (id) => {
      setActionError('')

      try {
        setActionLoading(true)

        const result =
          await api.get(
            `/documents/${id}`
          )

        setDocument(
          result.document
        )
      } catch (error) {
        setActionError(
          getErrorMessage(error)
        )
      } finally {
        setActionLoading(false)
      }
    }

  const [
    quizOpen,
    setQuizOpen,
  ] = useState(false)

  const runAction =
    async (
      endpoint,
      body = {}
    ) => {
      if (!document?._id) return

      setActionError('')

      try {
        setActionLoading(true)

        const result =
          await api.post(
            `/documents/${document._id}/${endpoint}`,
            body
          )

        if (result.document) {
          setDocument(
            result.document
          )
        }

        return result
      } catch (error) {
        setActionError(
          getErrorMessage(error)
        )
      } finally {
        setActionLoading(false)
      }
    }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          AI Study
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Upload study material and use AI
          to understand it.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex gap-2">
            <AlertCircle
              size={18}
            />
            <span>
              {error}
            </span>
          </div>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex gap-2">
            <AlertCircle
              size={18}
            />
            <span>
              {actionError}
            </span>
          </div>
        </div>
      )}

      <section className="rounded-2xl border bg-white p-6">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center">
          {loading ? (
            <Loader2
              className="animate-spin"
              size={28}
            />
          ) : (
            <Upload size={28} />
          )}

          <span className="mt-3 font-medium">
            {loading
              ? 'Processing document...'
              : 'Upload study material'}
          </span>

          <span className="mt-1 text-xs text-slate-500">
            PDF, DOCX, PPTX, TXT or supported
            images
          </span>

          <input
            type="file"
            accept={ACCEPTED_FILES}
            onChange={
              uploadDocument
            }
            disabled={loading}
            className="hidden"
          />
        </label>
      </section>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold">
            Documents
          </h2>

          {loadingDocuments ? (
            <div className="mt-4 text-sm text-slate-500">
              Loading...
            </div>
          ) : documents.length === 0 ? (
            <div className="mt-4 text-sm text-slate-500">
              No documents yet.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {documents.map(
                (item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() =>
                      selectDocument(
                        item._id
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-slate-50"
                  >
                    <FileText
                      size={18}
                    />

                    <span className="min-w-0 flex-1 truncate text-sm">
                      {item.originalName}
                    </span>
                  </button>
                )
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6">
          {!document ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Select a document to study.
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-semibold">
                  {document.originalName}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Status: {document.status}
                </p>
              </div>

              {document.status ===
                'failed' && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {document.error ||
                    'Document processing failed.'}
                </div>
              )}

              {document.cleanNotes && (
                <div className="mt-6">
                  <h3 className="font-semibold">
                    Notes
                  </h3>

                  <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7">
                    {document.cleanNotes}
                  </div>
                </div>
              )}

              {document.pointwiseSummary && (
                <div className="mt-6">
                  <h3 className="font-semibold">
                    Summary
                  </h3>

                  <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm">
                    {JSON.stringify(
                      document.pointwiseSummary,
                      null,
                      2
                    )}
                  </div>
                </div>
              )}

              {document.flashcards?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold">
                    Flashcards
                  </h3>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {document.flashcards.map(
                      (card, i) => (
                        <div
                          key={i}
                          className="rounded-xl border bg-slate-50 p-3 text-sm"
                        >
                          <p className="font-medium">
                            {card.question}
                          </p>
                          <p className="mt-1 text-slate-500">
                            {card.answer}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {document.conceptMap?.nodes?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold">
                    Concept map
                  </h3>

                  <ul className="mt-3 space-y-1 text-sm text-slate-600">
                    {document.conceptMap.edges?.map(
                      (edge, i) => {
                        const source =
                          document.conceptMap.nodes.find(
                            (n) => n.id === edge.source
                          )?.label || edge.source
                        const target =
                          document.conceptMap.nodes.find(
                            (n) => n.id === edge.target
                          )?.label || edge.target
                        return (
                          <li key={i}>
                            {source}{' '}
                            {edge.label
                              ? `— ${edge.label} →`
                              : '→'}{' '}
                            {target}
                          </li>
                        )
                      }
                    )}
                  </ul>
                </div>
              )}

              {(document.interviewQuestions?.beginner?.length > 0 ||
                document.interviewQuestions?.intermediate?.length > 0 ||
                document.interviewQuestions?.advanced?.length > 0) && (
                <div className="mt-6">
                  <h3 className="font-semibold">
                    Interview questions
                  </h3>

                  {['beginner', 'intermediate', 'advanced'].map(
                    (level) =>
                      document.interviewQuestions?.[level]?.length > 0 && (
                        <div key={level} className="mt-3">
                          <p className="text-xs font-medium uppercase text-slate-400">
                            {level}
                          </p>
                          <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                            {document.interviewQuestions[level].map(
                              (q, i) => (
                                <li key={i}>{q}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    setQuizOpen(true)
                  }
                  className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
                >
                  Take quiz
                </button>

                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    runAction(
                      'explain',
                      {
                        level:
                          'beginner',
                      }
                    )
                  }
                  className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
                >
                  Explain
                </button>

                <button
                  type="button"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    runAction(
                      'ask',
                      {
                        question:
                          'What are the most important concepts in this document?',
                      }
                    )
                  }
                  className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
                >
                  Ask AI
                </button>
              </div>

              {actionLoading && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  AI is processing...
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {quizOpen && document?._id && (
        <QuizModal
          title={`Quiz: ${document.originalName}`}
          generateEndpoint={`/documents/${document._id}/quiz`}
          method="get"
          onClose={() => setQuizOpen(false)}
        />
      )}
    </div>
  )
}