import AppError from '../utils/AppError.js'

const PROVIDER =
  (
    process.env
      .JOB_SEARCH_PROVIDER ||
    'none'
  ).toLowerCase()

function getNumber(
  value,
  fallback
) {
  const number =
    Number(value)

  return Number.isFinite(
    number
  )
    ? number
    : fallback
}

function getAgeHours(
  createdAt
) {
  if (!createdAt) {
    return null
  }

  const created =
    new Date(
      createdAt
    ).getTime()

  if (
    Number.isNaN(created)
  ) {
    return null
  }

  return Math.max(
    0,
    (Date.now() -
      created) /
      36e5
  )
}

function filterFreshJobs(
  jobs,
  maxAgeHours
) {
  if (
    !Number.isFinite(
      maxAgeHours
    )
  ) {
    return jobs
  }

  return jobs.filter(
    (job) => {
      if (
        job.ageHours ===
        null
      ) {
        return false
      }

      return (
        job.ageHours <=
        maxAgeHours
      )
    }
  )
}

async function adzunaSearch({
  query,
  location,
  page = 1,
  resultsPerPage = 20,
  maxAgeHours,
}) {
  const appId =
    process.env
      .ADZUNA_APP_ID

  const appKey =
    process.env
      .ADZUNA_APP_KEY

  const country =
    process.env
      .ADZUNA_COUNTRY ||
    'in'

  if (
    !appId ||
    !appKey
  ) {
    throw new AppError(
      'Live job search is not configured.',
      503,
      {
        code:
          'JOB_PROVIDER_NOT_CONFIGURED',
      }
    )
  }

  const params =
    new URLSearchParams()

  params.set(
    'app_id',
    appId
  )

  params.set(
    'app_key',
    appKey
  )

  params.set(
    'results_per_page',
    String(
      resultsPerPage
    )
  )

  params.set(
    'what',
    query || ''
  )

  if (location) {
    params.set(
      'where',
      location
    )
  }

  if (
    Number.isFinite(
      maxAgeHours
    )
  ) {
    const days =
      Math.max(
        1,
        Math.ceil(
          maxAgeHours /
            24
        )
      )

    params.set(
      'max_days_old',
      String(days)
    )
  }

  const url =
    `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(
      country
    )}/search/${page}?${params.toString()}`

  let response

  try {
    response =
      await fetch(
        url,
        {
          signal:
            AbortSignal.timeout(
              15000
            ),
        }
      )
  } catch {
    throw new AppError(
      'Live job provider could not be reached.',
      503,
      {
        code:
          'JOB_PROVIDER_UNAVAILABLE',
      }
    )
  }

  if (
    !response.ok
  ) {
    throw new AppError(
      'Live job provider returned an error.',
      502,
      {
        code:
          'JOB_PROVIDER_ERROR',
      }
    )
  }

  const data =
    await response.json()

  const jobs =
    (
      data?.results ||
      []
    ).map(
      (job) => {
        const createdAt =
          job.created ||
          job.created_at ||
          null

        const ageHours =
          getAgeHours(
            createdAt
          )

        return {
          id:
            job.id,

          title:
            job.title,

          company:
            job.company
              ?.display_name ||
            'Unknown company',

          location:
            job.location
              ?.display_name ||
            '',

          description:
            job.description ||
            '',

          url:
            job.redirect_url ||
            null,

          source:
            'adzuna',

          createdAt,

          ageHours,

          salary: {
            min:
              job.salary_min ??
              null,

            max:
              job.salary_max ??
              null,

            currency:
              job.salary_is_predicted
                ? null
                : undefined,
          },
        }
      }
    )

  return {
    provider:
      'adzuna',

    total:
      data?.count || 0,

    jobs:
      filterFreshJobs(
        jobs,
        maxAgeHours
      ),
  }
}

export async function searchJobs(
  options = {}
) {
  const maxAgeHours =
    Number.isFinite(
      Number(
        options.maxAgeHours
      )
    )
      ? Number(
          options.maxAgeHours
        )
      : null

  if (
    PROVIDER ===
    'adzuna'
  ) {
    return adzunaSearch({
      ...options,
      maxAgeHours,
    })
  }

  throw new AppError(
    'No live job search provider is configured.',
    503,
    {
      code:
        'JOB_PROVIDER_NOT_CONFIGURED',
    }
  )
}

export function getJobProviderStatus() {
  return {
    provider:
      PROVIDER,

    configured:
      PROVIDER ===
        'adzuna' &&
      Boolean(
        process.env.ADZUNA_APP_ID &&
          process.env.ADZUNA_APP_KEY
      ),
  }
}