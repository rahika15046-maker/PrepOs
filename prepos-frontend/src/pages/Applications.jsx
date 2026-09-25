
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  ExternalLink,
  RefreshCw,
  BriefcaseBusiness,
  AlertCircle,
} from 'lucide-react'
import { api } from '../lib/api'

function formatAge(hours) {
  if (
    hours === null ||
    hours === undefined
  ) {
    return 'Age unavailable'
  }

  if (hours < 1) {
    return 'Less than 1 hour ago'
  }

  if (hours < 24) {
    return `${Math.round(hours)}h ago`
  }

  return `${Math.round(hours / 24)}d ago`
}

function getErrorMessage(error) {
  return (
    error?.message ||
    'Unable to load job recommendations.'
  )
}

export default function Applications() {
  const [
    applications,
    setApplications,
  ] = useState([])

  const [
    listings,
    setListings,
  ] = useState([])

  const [
    readiness,
    setReadiness,
  ] = useState(null)

  const [
    maxAgeHours,
    setMaxAgeHours,
  ] = useState(168)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    loadingJobs,
    setLoadingJobs,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    jobsError,
    setJobsError,
  ] = useState('')

  const [
    provider,
    setProvider,
  ] = useState('')

  const loadApplications =
    useCallback(
      async () => {
        try {
          const result =
            await api.get(
              '/job-applications'
            )

          setApplications(
            result.applications ||
            []
          )
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

  const loadJobs =
    useCallback(
      async () => {
        setLoadingJobs(true)
        setJobsError('')

        try {
          const result =
            await api.get(
              `/job-applications/recommendations?maxAgeHours=${maxAgeHours}`
            )

          setListings(
            result.listings ||
            []
          )

          setReadiness(
            result.readinessScore ??
            null
          )

          setProvider(
            result.provider ||
            ''
          )
        } catch (error) {
          setJobsError(
            getErrorMessage(error)
          )
        } finally {
          setLoadingJobs(false)
        }
      },
      [maxAgeHours]
    )

  useEffect(() => {
    loadApplications()
  }, [loadApplications])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Jobs & Applications
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Live job listings matched against
              your verified PrepOS progress.
            </p>
          </div>

          <button
            type="button"
            onClick={loadJobs}
            disabled={loadingJobs}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                loadingJobs
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex gap-2">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              {error}
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-semibold">
              Recent opportunities
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Filter listings by posting age.
            </p>
          </div>

          <div>
            <label
              htmlFor="maxAgeHours"
              className="mb-1 block text-xs font-medium text-slate-500"
            >
              Posted within
            </label>

            <select
              id="maxAgeHours"
              value={maxAgeHours}
              onChange={(event) =>
                setMaxAgeHours(
                  Number(
                    event.target.value
                  )
                )
              }
              className="rounded-xl border px-3 py-2 text-sm"
            >
              <option value={24}>
                Last 24 hours
              </option>

              <option value={72}>
                Last 3 days
              </option>

              <option value={168}>
                Last 7 days
              </option>
            </select>
          </div>
        </div>

        {provider && (
          <div className="mt-4 text-xs text-slate-500">
            Source: {provider}
          </div>
        )}

        {readiness !== null && (
          <div className="mt-4 text-sm">
            Verified preparation progress:{' '}
            <strong>
              {readiness}%
            </strong>
          </div>
        )}

        {jobsError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {jobsError}
          </div>
        )}

        {loadingJobs ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Loading recent jobs...
          </div>
        ) : listings.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No live listings were returned
            for this freshness window.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {listings.map((job) => (
              <article
                key={
                  job.id ||
                  `${job.company}-${job.title}-${job.createdAt}`
                }
                className="rounded-2xl border p-5"
              >
                <div className="flex gap-3">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <BriefcaseBusiness
                      size={20}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">
                      {job.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {job.company}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {job.location}
                      {' · '}
                      {formatAge(
                        job.ageHours
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <div className="text-sm font-medium">
                    Verified requirement match:{' '}
                    {job.matchPercentage}%
                  </div>

                  <p className="mt-1 text-xs text-slate-600">
                    {job.matchReason}
                  </p>
                </div>

                {job.matchedSkills?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Verified matches
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {job.matchedSkills.map(
                        (skill) => (
                          <span
                            key={
                              skill.name
                            }
                            className="rounded-full border px-3 py-1 text-xs"
                          >
                            {skill.name}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {job.missingSkills?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Gaps to review
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {job.missingSkills.map(
                        (skill) => (
                          <span
                            key={
                              skill.name
                            }
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800"
                          >
                            {skill.name}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-medium underline"
                  >
                    View listing
                    <ExternalLink
                      size={15}
                    />
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-semibold">
          Application tracker
        </h2>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">
            Loading applications...
          </p>
        ) : applications.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No applications saved yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {applications.map(
              (application) => (
                <div
                  key={application._id}
                  className="rounded-xl border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {application.role}
                      </p>

                      <p className="text-sm text-slate-500">
                        {application.company}
                      </p>
                    </div>

                    <span className="rounded-full border px-3 py-1 text-xs">
                      {application.stage ||
                        'Saved'}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  )
}