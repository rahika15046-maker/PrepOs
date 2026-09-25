
import JobApplication from '../models/JobApplication.js'
import UserProfile from '../models/UserProfile.js'
import UserSkill from '../models/UserSkill.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import {
  searchJobs,
  getJobProviderStatus,
} from '../services/jobSearchService.js'
import { calculateJobReadiness } from '../services/jobReadinessService.js'
import { getUserBlueprint } from '../services/careerBlueprintService.js'

const APPLICATION_STAGES = [
  'Saved',
  'Preparing',
  'Applied',
  'Online Assessment',
  'Interview',
  'Rejected',
  'Offer',
]

function cleanString(value, maxLength = 500) {
  if (value === undefined || value === null) return undefined

  const text = String(value).trim()
  return text ? text.slice(0, maxLength) : undefined
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildSearchText(job) {
  return normalize(
    [
      job.title,
      job.company,
      job.location,
      job.description,
    ].join(' ')
  )
}

function getBlueprintRequirements(blueprint) {
  const requirements = []

  for (const item of blueprint?.technologies || []) {
    if (item?.name) {
      requirements.push({
        name: String(item.name).trim(),
        category: 'technology',
        priority: Number(item.priority) || 5,
      })
    }
  }

  for (const item of blueprint?.skills || []) {
    if (item?.name) {
      requirements.push({
        name: String(item.name).trim(),
        category: 'skill',
        priority: Number(item.priority) || 5,
      })
    }
  }

  return requirements
}

function requirementAppearsInJob(requirement, jobText) {
  const required = normalize(requirement.name)

  if (!required) return false

  if (jobText.includes(required)) return true

  const words = required
    .split(' ')
    .filter((word) => word.length >= 3)

  if (!words.length) return false

  const matches = words.filter((word) =>
    jobText.includes(word)
  )

  return matches.length >= Math.max(
    1,
    Math.ceil(words.length * 0.6)
  )
}

function buildVerifiedSkillMap(userSkills) {
  const map = new Map()

  for (const skill of userSkills) {
    const name = normalize(
      skill.skillName ||
      skill.skill ||
      skill.name
    )

    if (!name) continue

    map.set(name, {
      name:
        skill.skillName ||
        skill.skill ||
        skill.name,
      level:
        skill.verifiedLevel ??
        skill.level ??
        0,
      progress:
        Number(skill.progress) || 0,
    })
  }

  return map
}

function isVerified(skill) {
  if (!skill) return false

  if (Number(skill.progress) >= 60) {
    return true
  }

  return Number(skill.verifiedLevel) >= 60
}

function calculateJobMatch(job, blueprint, userSkills) {
  const requirements =
    getBlueprintRequirements(blueprint)

  const jobText =
    buildSearchText(job)

  const verifiedSkills =
    buildVerifiedSkillMap(userSkills)

  const matchedSkills = []
  const missingSkills = []

  for (const requirement of requirements) {
    if (
      !requirementAppearsInJob(
        requirement,
        jobText
      )
    ) {
      continue
    }

    const requiredName =
      normalize(requirement.name)

    let verifiedSkill =
      verifiedSkills.get(requiredName)

    if (!verifiedSkill) {
      for (const [
        skillName,
        skill,
      ] of verifiedSkills.entries()) {
        if (
          skillName.includes(requiredName) ||
          requiredName.includes(skillName)
        ) {
          verifiedSkill = skill
          break
        }
      }
    }

    if (isVerified(verifiedSkill)) {
      matchedSkills.push({
        name: requirement.name,
        category: requirement.category,
        priority: requirement.priority,
        verifiedLevel:
          verifiedSkill.level,
        verifiedProgress:
          verifiedSkill.progress,
      })
    } else {
      missingSkills.push({
        name: requirement.name,
        category: requirement.category,
        priority: requirement.priority,
        reason: verifiedSkill
          ? 'This skill is present but is not yet verified at the required level.'
          : 'No verified PrepOS evidence was found for this requirement.',
      })
    }
  }

  const uniqueMatched = Array.from(
    new Map(
      matchedSkills.map((item) => [
        normalize(item.name),
        item,
      ])
    ).values()
  )

  const uniqueMissing = Array.from(
    new Map(
      missingSkills.map((item) => [
        normalize(item.name),
        item,
      ])
    ).values()
  )

  const total =
    uniqueMatched.length +
    uniqueMissing.length

  const matchPercentage = total
    ? Math.round(
        (uniqueMatched.length / total) * 100
      )
    : 0

  let matchReason =
    'No specific verified skill match was identified from the available job description.'

  if (
    uniqueMatched.length &&
    uniqueMissing.length
  ) {
    matchReason =
      `Your verified progress matches ${uniqueMatched.length} identified requirement${uniqueMatched.length === 1 ? '' : 's'}, while ${uniqueMissing.length} identified requirement${uniqueMissing.length === 1 ? '' : 's'} remain to be verified.`
  } else if (uniqueMatched.length) {
    matchReason =
      `Your verified progress matches ${uniqueMatched.length} identified requirement${uniqueMatched.length === 1 ? '' : 's'} from this listing.`
  } else if (uniqueMissing.length) {
    matchReason =
      `${uniqueMissing.length} identified requirement${uniqueMissing.length === 1 ? '' : 's'} from this listing are not currently verified in PrepOS.`
  }

  return {
    matchPercentage,
    matchedSkills: uniqueMatched,
    missingSkills: uniqueMissing,
    matchReason,
  }
}

function sanitizeJob(job) {
  return {
    id: job.id || job._id || null,
    title:
      cleanString(job.title, 250) ||
      'Untitled position',
    company:
      cleanString(job.company, 200) ||
      'Unknown company',
    location:
      cleanString(job.location, 250) ||
      'Not specified',
    url:
      cleanString(job.url, 1000) ||
      null,
    description:
      cleanString(job.description, 3000) ||
      '',
    source:
      cleanString(job.source, 100) ||
      'unknown',
    createdAt:
      job.createdAt || null,
    ageHours:
      Number.isFinite(Number(job.ageHours))
        ? Number(job.ageHours)
        : null,
    salary: job.salary || null,
  }
}

export const listApplications = catchAsync(
  async (req, res) => {
    const applications =
      await JobApplication.find({
        user: req.user._id,
      }).sort('-createdAt')

    const board =
      applications.reduce(
        (result, application) => {
          const stage =
            application.stage || 'Saved'

          if (!result[stage]) {
            result[stage] = []
          }

          result[stage].push(application)

          return result
        },
        {}
      )

    res.status(200).json({
      success: true,
      applications,
      board,
    })
  }
)

export const createApplication = catchAsync(
  async (req, res, next) => {
    const company =
      cleanString(req.body?.company, 200)

    const role =
      cleanString(req.body?.role, 250)

    if (!company) {
      return next(
        new AppError(
          'Company is required.',
          400
        )
      )
    }

    if (!role) {
      return next(
        new AppError(
          'Role is required.',
          400
        )
      )
    }

    const stage =
      cleanString(
        req.body?.stage,
        50
      ) || 'Saved'

    if (!APPLICATION_STAGES.includes(stage)) {
      return next(
        new AppError(
          'Invalid application stage.',
          400
        )
      )
    }

    const application =
      await JobApplication.create({
        user: req.user._id,
        company,
        role,
        location:
          cleanString(
            req.body?.location,
            250
          ),
        applicationDate:
          req.body?.applicationDate ||
          undefined,
        deadline:
          req.body?.deadline ||
          undefined,
        link:
          cleanString(
            req.body?.link,
            1000
          ),
        notes:
          cleanString(
            req.body?.notes,
            5000
          ),
        followUpDate:
          req.body?.followUpDate ||
          undefined,
        stage,
      })

    res.status(201).json({
      success: true,
      application,
    })
  }
)

export const updateApplication = catchAsync(
  async (req, res, next) => {
    const fields = [
      'company',
      'role',
      'location',
      'applicationDate',
      'deadline',
      'link',
      'notes',
      'followUpDate',
      'stage',
    ]

    const updates = {}

    for (const field of fields) {
      if (
        Object.prototype.hasOwnProperty.call(
          req.body || {},
          field
        )
      ) {
        updates[field] = req.body[field]
      }
    }

    if (
      updates.stage !== undefined &&
      !APPLICATION_STAGES.includes(
        updates.stage
      )
    ) {
      return next(
        new AppError(
          'Invalid application stage.',
          400
        )
      )
    }

    if (
      updates.company !== undefined
    ) {
      updates.company =
        cleanString(
          updates.company,
          200
        )

      if (!updates.company) {
        return next(
          new AppError(
            'Company cannot be empty.',
            400
          )
        )
      }
    }

    if (
      updates.role !== undefined
    ) {
      updates.role =
        cleanString(
          updates.role,
          250
        )

      if (!updates.role) {
        return next(
          new AppError(
            'Role cannot be empty.',
            400
          )
        )
      }
    }

    if (
      updates.location !== undefined
    ) {
      updates.location =
        cleanString(
          updates.location,
          250
        )
    }

    if (
      updates.link !== undefined
    ) {
      updates.link =
        cleanString(
          updates.link,
          1000
        )
    }

    if (
      updates.notes !== undefined
    ) {
      updates.notes =
        cleanString(
          updates.notes,
          5000
        )
    }

    const application =
      await JobApplication.findOneAndUpdate(
        {
          _id: req.params.id,
          user: req.user._id,
        },
        updates,
        {
          new: true,
          runValidators: true,
        }
      )

    if (!application) {
      return next(
        new AppError(
          'Application not found.',
          404
        )
      )
    }

    res.status(200).json({
      success: true,
      application,
    })
  }
)

export const deleteApplication = catchAsync(
  async (req, res, next) => {
    const application =
      await JobApplication.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id,
      })

    if (!application) {
      return next(
        new AppError(
          'Application not found.',
          404
        )
      )
    }

    res.status(200).json({
      success: true,
      message: 'Application removed.',
    })
  }
)

export const getRecommendations = catchAsync(
  async (req, res, next) => {
    const profile =
      await UserProfile.findOne({
        user: req.user._id,
      }).lean()

    if (!profile?.role) {
      return next(
        new AppError(
          'Complete AI career onboarding before requesting job recommendations.',
          400
        )
      )
    }

    const blueprint =
      await getUserBlueprint(
        req.user._id
      )

    const userSkills =
      await UserSkill.find({
        user: req.user._id,
      }).lean()

    const requestedAge =
      Number(
        req.query?.maxAgeHours || 168
      )

    const maxAgeHours =
      Number.isFinite(requestedAge) &&
      requestedAge > 0
        ? Math.min(
            requestedAge,
            168
          )
        : 168

    const query =
      cleanString(
        req.query?.query,
        200
      ) ||
      blueprint.normalizedRole ||
      profile.role

    const location =
      cleanString(
        req.query?.location,
        200
      ) || 'Remote'

    const result =
      await searchJobs({
        query,
        location,
        maxAgeHours,
      })

    const jobs =
      Array.isArray(result)
        ? result
        : result?.jobs || []

    const listings =
      jobs
        .map(sanitizeJob)
        .map((job) => ({
          ...job,
          ...calculateJobMatch(
            job,
            blueprint,
            userSkills
          ),
        }))

    const readiness =
      await calculateJobReadiness(
        req.user._id
      )

    const providerStatus =
      getJobProviderStatus()

    res.status(200).json({
      success: true,
      targetRole:
        blueprint.normalizedRole,
      requestedRole:
        blueprint.requestedRole,
      readinessScore:
        readiness.readiness,
      readinessEvidence:
        readiness.evidence,
      readinessGaps:
        readiness.gaps,
      freshness: {
        maxAgeHours,
      },
      query,
      location,
      provider:
        result?.provider ||
        providerStatus.provider ||
        null,
      total:
        result?.total ??
        listings.length,
      listings,
    })
  }
)