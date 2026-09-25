import Role from '../models/Role.js'
import UserProfile from '../models/UserProfile.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import {
  generateCareerBlueprintForRole,
  getCareerBlueprint,
} from '../services/roleIntelligenceService.js'

export const listRoles = catchAsync(
  async (req, res) => {
    const roles = await Role.find({
      active: true,
    })
      .select(
        'name category description'
      )
      .sort('name')

    res.status(200).json({
      success: true,
      roles,
    })
  }
)

export const getRole = catchAsync(
  async (req, res, next) => {
    const roleName =
      String(req.params.name || '').trim()

    const role =
      await Role.findOne({
        name: roleName,
        active: true,
      }).select(
        'name category description'
      )

    if (!role) {
      return next(
        new AppError(
          'Career role not found.',
          404
        )
      )
    }

    res.status(200).json({
      success: true,
      role,
    })
  }
)

/*
 * Generate/re-generate the AI career blueprint
 * for the user's selected target role.
 *
 * This endpoint is also the retry mechanism if AI
 * generation fails during onboarding.
 */
export const generateMyBlueprint =
  catchAsync(async (req, res, next) => {
    const profile =
      await UserProfile.findOne({
        user: req.user._id,
      })

    if (!profile?.role) {
      return next(
        new AppError(
          'Select a target career role before generating a blueprint.',
          400
        )
      )
    }

    const blueprint =
      await generateCareerBlueprintForRole(
        req.user._id,
        profile.role
      )

    res.status(200).json({
      success: true,
      blueprint,
    })
  })

export const getMyBlueprint =
  catchAsync(async (req, res) => {
    const blueprint =
      await getCareerBlueprint(
        req.user._id
      )

    res.status(200).json({
      success: true,
      blueprint,
    })
  })