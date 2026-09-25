import jwt from 'jsonwebtoken'

import LinkedInActivity from '../models/LinkedInActivity.js'
import Activity from '../models/Activity.js'
import QuizAttempt from '../models/QuizAttempt.js'
import DSAProgress from '../models/DSAProgress.js'
import UserTopicProgress from '../models/UserTopicProgress.js'
import Project from '../models/Project.js'
import RoleBlueprint from '../models/RoleBlueprint.js'
import UserProfile from '../models/UserProfile.js'

import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'

import {
  askPrepAI,
} from '../services/aiService.js'

import {
  isConfigured,
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchUserInfo,
} from '../services/linkedinOAuthService.js'

function startOfDay(date) {
  const result =
    new Date(date)

  result.setHours(
    0,
    0,
    0,
    0
  )

  return result
}

function buildProgressContext({
  blueprint,
  activities,
  quizAttempts,
  dsaSolved,
  completedTopics,
  projects,
}) {
  return {
    targetRole:
      blueprint?.normalizedRole ||
      null,

    completedTopics:
      completedTopics.map(
        (item) => ({
          topicKey:
            item.topicKey,

          progress:
            item.progress,

          quizScore:
            item.quizScore,
        })
      ),

    dsaSolved:
      dsaSolved.length,

    quizScores:
      quizAttempts.map(
        (item) => ({
          score:
            item.score,
          date:
            item.createdAt,
        })
      ),

    recentActivity:
      activities.map(
        (item) => ({
          type:
            item.type,

          meta:
            item.meta,

          xpEarned:
            item.xpEarned,

          date:
            item.createdAt,
        })
      ),

    projects:
      projects.map(
        (project) => ({
          name:
            project.name,

          progress:
            project.progress,

          status:
            project.status,
        })
      ),
  }
}

export const getLinkedInActivity =
  catchAsync(async (req, res) => {
    const activity =
      await LinkedInActivity.findOneAndUpdate(
        {
          user: req.user._id,
        },
        {
          $setOnInsert: {
            user: req.user._id,
          },
        },
        {
          upsert: true,
          new: true,
        }
      )

    res.status(200).json({
      success: true,
      activity,
      oauthConfigured:
        isConfigured(),
    })
  })

export const updateLinkedInActivity =
  catchAsync(async (
    req,
    res,
    next
  ) => {
    const updates = {}

    if (
      req.body.lastPostDate !==
      undefined
    ) {
      updates.lastPostDate =
        req.body.lastPostDate
    }

    if (
      req.body.postsThisMonth !==
      undefined
    ) {
      const value =
        Number(
          req.body.postsThisMonth
        )

      if (
        !Number.isInteger(
          value
        ) ||
        value < 0
      ) {
        return next(
          new AppError(
            'postsThisMonth must be a non-negative integer.',
            400
          )
        )
      }

      updates.postsThisMonth =
        value
    }

    if (
      req.body.autoDraftEnabled !==
      undefined
    ) {
      updates.autoDraftEnabled =
        Boolean(
          req.body.autoDraftEnabled
        )
    }

    const activity =
      await LinkedInActivity.findOneAndUpdate(
        {
          user: req.user._id,
        },
        {
          $set: updates,

          $setOnInsert: {
            user: req.user._id,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      )

    res.status(200).json({
      success: true,
      activity,
    })
  })

export const draftLinkedInPost =
  catchAsync(async (
    req,
    res,
    next
  ) => {
    const profile =
      await UserProfile.findOne({
        user: req.user._id,
      })

    const blueprint =
      await RoleBlueprint.findOne({
        user: req.user._id,
      })

    if (!profile?.role) {
      return next(
        new AppError(
          'Complete onboarding first.',
          400
        )
      )
    }

    if (!blueprint) {
      return next(
        new AppError(
          'Career blueprint not found.',
          400
        )
      )
    }

    const today =
      startOfDay(new Date())

    const yesterday =
      new Date(today)

    yesterday.setDate(
      yesterday.getDate() - 1
    )

    const [
      activities,
      quizAttempts,
      dsaSolved,
      completedTopics,
      projects,
    ] = await Promise.all([
      Activity.find({
        user: req.user._id,
        createdAt: {
          $gte: yesterday,
          $lt: today,
        },
      }).sort('createdAt'),

      QuizAttempt.find({
        user: req.user._id,
        createdAt: {
          $gte: yesterday,
          $lt: today,
        },
      }).sort('createdAt'),

      DSAProgress.find({
        user: req.user._id,
        solved: true,
        solvedAt: {
          $gte: yesterday,
          $lt: today,
        },
      }),

      UserTopicProgress.find({
        user: req.user._id,
        status: 'completed',
        progress: {
          $gte: 100,
        },
      }),

      Project.find({
        user: req.user._id,
      }),
    ])

    const context =
      buildProgressContext({
        blueprint,
        activities,
        quizAttempts,
        dsaSolved,
        completedTopics,
        projects,
      })

    const requestedTopic =
      String(
        req.body?.topic || ''
      ).trim()

    const prompt = `
Create a professional LinkedIn post for a technology learner.

Target role:
${blueprint.normalizedRole}

Use ONLY genuine PrepOS progress supplied below.

Do not invent:
- projects
- technologies
- achievements
- certifications
- job offers
- percentages
- solved problems
- learning milestones

If yesterday had little activity, write a modest learning update rather than fabricating a milestone.

The user may provide an optional topic:
${requestedTopic || 'No specific topic provided.'}

PrepOS verified progress:
${JSON.stringify(
  context,
  null,
  2
)}

Requirements:
- professional
- authentic
- concise
- suitable for LinkedIn
- no fake claims
- no exaggerated career claims
- do not mention internal database fields
- do not say that LinkedIn automatically posted it

Return only the post text.
`

    const draft =
      await askPrepAI(
        context,
        prompt
      )

    const activity =
      await LinkedInActivity.findOneAndUpdate(
        {
          user: req.user._id,
        },
        {
          $push: {
            draftIdeas: {
              prompt:
                requestedTopic ||
                'Recent verified PrepOS progress',

              draft,
            },
          },

          $setOnInsert: {
            user: req.user._id,
          },
        },
        {
          upsert: true,
          new: true,
        }
      )

    res.status(201).json({
      success: true,
      draft,
      basedOn: {
        yesterdayActivities:
          activities.length,

        yesterdayQuizzes:
          quizAttempts.length,

        yesterdayDsaSolved:
          dsaSolved.length,

        completedTopics:
          completedTopics.length,

        projects:
          projects.length,
      },
      activity,
    })
  })

export const startLinkedInOAuth =
  catchAsync(async (
    req,
    res,
    next
  ) => {
    if (!isConfigured()) {
      return next(
        new AppError(
          'LinkedIn OAuth is not configured on this server.',
          400
        )
      )
    }

    if (!process.env.JWT_SECRET) {
      return next(
        new AppError(
          'JWT_SECRET is not configured.',
          500
        )
      )
    }

    const state =
      jwt.sign(
        {
          userId:
            String(
              req.user._id
            ),
        },

        process.env.JWT_SECRET,

        {
          expiresIn: '10m',
        }
      )

    res.status(200).json({
      success: true,

      url:
        buildAuthorizationUrl(
          state
        ),
    })
  })

export const linkedInOAuthCallback =
  catchAsync(async (
    req,
    res
  ) => {
    const {
      code,
      state,
      error,
    } = req.query

    const clientUrl =
      process.env.CLIENT_URL ||
      'http://localhost:5173'

    if (
      error ||
      !code ||
      !state
    ) {
      return res.redirect(
        `${clientUrl}/app/linkedin?linkedin=error`
      )
    }

    let userId

    try {
      const decoded =
        jwt.verify(
          state,
          process.env.JWT_SECRET
        )

      userId =
        decoded.userId
    } catch {
      return res.redirect(
        `${clientUrl}/app/linkedin?linkedin=error`
      )
    }

    try {
      const token =
        await exchangeCodeForToken(
          code
        )

      const profile =
        await fetchUserInfo(
          token.access_token
        )

      await LinkedInActivity.findOneAndUpdate(
        {
          user: userId,
        },
        {
          connected: true,

          linkedinName:
            profile.name,

          linkedinSub:
            profile.sub,
        },
        {
          upsert: true,
        }
      )

      /*
       * We intentionally do NOT persist the access token.
       * Current PrepOS functionality does not require it because
       * automatic LinkedIn posting/activity access isn't being claimed.
       */

      return res.redirect(
        `${clientUrl}/app/linkedin?linkedin=connected`
      )
    } catch (error) {
      console.error(
        '[linkedin oauth]',
        error.message
      )

      return res.redirect(
        `${clientUrl}/app/linkedin?linkedin=error`
      )
    }
  })