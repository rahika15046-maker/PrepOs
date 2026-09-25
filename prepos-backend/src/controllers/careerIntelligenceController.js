import UserProfile from '../models/UserProfile.js'
import RoleBlueprint from '../models/RoleBlueprint.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import {
  generateRoleBlueprint,
  composeRoadmap,
  expandBlueprintDetails,
  isExpanding,
} from '../services/roleIntelligenceService.js'

/** Fire-and-forget: the HTTP request must not wait for dozens of AI calls. */
function startExpansion(userId) {
  expandBlueprintDetails(userId).catch((error) =>
    console.error('[roadmap] background expansion error:', error.message)
  )
}

function statusPayload(blueprint, userId) {
  const detail = blueprint.toObject().detail || {}
  const stale =
    detail.status === 'expanding' &&
    !isExpanding(userId) &&
    (!detail.updatedAt || Date.now() - new Date(detail.updatedAt) > 120000)

  return {
    ...detail,
    // A server restart mid-expansion leaves "expanding" behind — surface that honestly.
    status: stale ? 'partial' : detail.status,
    running: isExpanding(userId),
  }
}

export const getBlueprint = catchAsync(async (req, res) => {
  const blueprint = await RoleBlueprint.findOne({ user: req.user._id })

  res.status(200).json({
    success: true,
    blueprint,
    detail: blueprint ? statusPayload(blueprint, req.user._id) : null,
  })
})

export const generateBlueprint = catchAsync(async (req, res, next) => {
  const requestedRole = String(req.body?.role || '').trim()

  if (requestedRole.length < 3) {
    return next(new AppError('Target career role is required (min 3 characters).', 400))
  }

  if (requestedRole.length > 150) {
    return next(new AppError('Target career role is too long.', 400))
  }

  const generated = await generateRoleBlueprint(requestedRole)

  const roadmap = composeRoadmap(generated.roadmap, {
    role: generated.normalizedRole,
    csSubjects: generated.csSubjects,
    dsaRequired: generated.dsa?.required,
    dsaImportance: generated.dsa?.importance,
  })

  const blueprint = await RoleBlueprint.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: {
        user: req.user._id,
        requestedRole,
        normalizedRole: generated.normalizedRole,
        category: generated.category,
        summary: generated.summary,
        careerOutcome: generated.careerOutcome || '',
        technologies: generated.technologies,
        skills: generated.skills,
        csSubjects: generated.csSubjects,
        dsa: generated.dsa,
        interviewAreas: generated.interviewAreas,
        projectRequirements: generated.projectRequirements,
        roadmap,
        assessmentPlan: generated.assessmentPlan,
        source: 'ai',
        model: process.env.AI_MODEL || 'configured-provider',
        generatedAt: new Date(),
        roadmapVersion: 2,
        detail: {
          status: 'pending',
          total: roadmap.length,
          done: roadmap.filter((t) => t.detailed).length,
          error: '',
          updatedAt: new Date(),
        },
      },
      $inc: { version: 1 },
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  )

  await UserProfile.findOneAndUpdate(
    { user: req.user._id },
    { user: req.user._id, role: generated.normalizedRole },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  )

  startExpansion(req.user._id)

  res.status(200).json({
    success: true,
    blueprint,
    detail: statusPayload(blueprint, req.user._id),
  })
})

/** Resume expansion (after a failure/restart) without regenerating the outline. */
export const expandBlueprint = catchAsync(async (req, res, next) => {
  const blueprint = await RoleBlueprint.findOne({ user: req.user._id })
  if (!blueprint) return next(new AppError('Generate your career blueprint first.', 400))

  startExpansion(req.user._id)

  res.status(202).json({
    success: true,
    detail: { ...statusPayload(blueprint, req.user._id), status: 'expanding', running: true },
  })
})

/**
 * Upgrades an older, flat blueprint in place: keeps the user's topics (and their
 * progress keys), adds the curated Core-CS / DSA / projects / interview tracks,
 * then expands details for everything still missing.
 */
export const upgradeBlueprint = catchAsync(async (req, res, next) => {
  const blueprint = await RoleBlueprint.findOne({ user: req.user._id })
  if (!blueprint) return next(new AppError('Generate your career blueprint first.', 400))

  const roadmap = composeRoadmap(blueprint.roadmap, {
    role: blueprint.normalizedRole,
    csSubjects: blueprint.csSubjects,
    dsaRequired: blueprint.dsa?.required,
    dsaImportance: blueprint.dsa?.importance,
  })

  blueprint.roadmap = roadmap
  blueprint.roadmapVersion = 2
  blueprint.detail = {
    status: 'pending',
    total: roadmap.length,
    done: roadmap.filter((t) => t.detailed).length,
    error: '',
    updatedAt: new Date(),
  }
  await blueprint.save()

  startExpansion(req.user._id)

  res.status(200).json({
    success: true,
    detail: statusPayload(blueprint, req.user._id),
  })
})

export const getDetailStatus = catchAsync(async (req, res, next) => {
  const blueprint = await RoleBlueprint.findOne({ user: req.user._id }).select('detail roadmap.key roadmap.detailed')
  if (!blueprint) return next(new AppError('Career blueprint not found.', 404))

  const total = blueprint.roadmap.length
  const done = blueprint.roadmap.filter((t) => t.detailed).length
  const payload = statusPayload(blueprint, req.user._id)

  res.status(200).json({
    success: true,
    detail: { ...payload, total, done },
  })
})
