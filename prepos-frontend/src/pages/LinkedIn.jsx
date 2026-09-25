import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Link2,
  RefreshCw,
} from 'lucide-react'
import { api } from '../lib/api'

function getErrorMessage(error) {
  return (
    error?.message ||
    'Unable to complete the LinkedIn request.'
  )
}

export default function LinkedIn() {
  const [
    status,
    setStatus,
  ] = useState(null)

  const [
    draft,
    setDraft,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    drafting,
    setDrafting,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  const loadStatus =
    useCallback(
      async () => {
        setLoading(true)
        setError('')

        try {
          const result =
            await api.get(
              '/linkedin'
            )

          setStatus({
            ...(result.activity || {}),
            oauthConfigured:
              result.oauthConfigured,
          })
        } catch (error) {
          setError(
            getErrorMessage(error)
          )
        } finally {
          setLoading(false)
        }
      },
      []
    )

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  const refreshConnection =
    async () => {
      setError('')
      setSuccess('')

      try {
        await loadStatus()

        setSuccess(
          'LinkedIn connection refreshed.'
        )
      } catch (error) {
        setError(
          getErrorMessage(error)
        )
      }
    }

  const connectLinkedIn =
    async () => {
      setError('')
      setSuccess('')

      try {
        const result =
          await api.get(
            '/linkedin/oauth/start'
          )

        if (result.url) {
          window.location.href =
            result.url
        } else {
          throw new Error(
            'LinkedIn authorization URL was not returned.'
          )
        }
      } catch (error) {
        setError(
          getErrorMessage(error)
        )
      }
    }

  const generateDraft =
    async () => {
      setDrafting(true)
      setError('')
      setSuccess('')

      try {
        const result =
          await api.post(
            '/linkedin/draft'
          )

        setDraft(
          result.draft ||
          result.post ||
          ''
        )

        setSuccess(
          'Progress-based LinkedIn draft generated.'
        )
      } catch (error) {
        setError(
          getErrorMessage(error)
        )
      } finally {
        setDrafting(false)
      }
    }

  const copyDraft =
    async () => {
      if (!draft) return

      try {
        await navigator.clipboard.writeText(
          draft
        )

        setSuccess(
          'Draft copied to clipboard.'
        )
      } catch {
        setError(
          'Unable to copy the draft.'
        )
      }
    }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          LinkedIn
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Connect your account and create
          posts based on genuine PrepOS progress.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <div className="flex gap-2">
            <CheckCircle2 size={18} />
            {success}
          </div>
        </div>
      )}

      <section className="rounded-2xl border bg-black p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-slate-100 p-3">
            <Link2 size={24} />
          </div>

          <div className="flex-1">
            <h2 className="font-semibold">
              LinkedIn connection
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Authentication permissions determine
              which LinkedIn actions are available.
            </p>

            <div className="mt-4 text-sm">
              Status:{' '}
              <strong>
                {loading
                  ? 'Checking...'
                  : status?.connected
                    ? 'Connected'
                    : 'Not connected'}
              </strong>
            </div>

            {!loading &&
              status?.oauthConfigured === false && (
                <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                  LinkedIn OAuth is not configured on this server, so
                  connecting isn't available yet. Drafting posts from
                  your PrepOS progress still works without a connection.
                </p>
              )}

            <div className="mt-4 flex flex-wrap gap-2">
              {!status?.connected &&
                status?.oauthConfigured !== false && (
                  <button
                    type="button"
                    onClick={
                      connectLinkedIn
                    }
                    className="rounded-xl border px-4 py-2 text-sm font-medium"
                  >
                    Connect LinkedIn
                  </button>
                )}

              <button
                type="button"
                onClick={
                  refreshConnection
                }
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-black
       p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">
              Daily professional post
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              The draft is generated from verified
              PrepOS activity.
            </p>
          </div>

          <button
            type="button"
            onClick={generateDraft}
            disabled={drafting}
            className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
          >
            {drafting
              ? 'Generating...'
              : 'Generate draft'}
          </button>
        </div>

        {draft && (
          <div className="mt-5">
            <textarea
              value={draft}
              onChange={(event) =>
                setDraft(
                  event.target.value
                )
              }
              rows={10}
              className="w-full rounded-xl border p-4 text-sm"
            />

            <button
              type="button"
              onClick={copyDraft}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"
            >
              <Copy size={15} />
              Copy draft
            </button>
          </div>
        )}
      </section>
    </div>
  )
}