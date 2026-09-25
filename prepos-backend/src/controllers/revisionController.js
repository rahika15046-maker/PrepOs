import Revision from '../models/Revision.js'
import UserTopicProgress from '../models/UserTopicProgress.js'
import catchAsync from '../utils/catchAsync.js'
import { spacedRevisionPlan, computeRevisionPriority } from '../services/revisionEngine.js'
import { recordActivityAndXp } from '../services/activityHelper.js'

export const listRevisions = catchAsync(async (req, res) => {
  const revisions = await Revision.find({ user: req.user._id }).sort('scheduledFor')
  res.status(200).json({ success: true, revisions })
})

/** Called when a topic is freshly marked weak (e.g. after a bad quiz). */
export const scheduleSpacedRevision = catchAsync(async (req, res) => {
  const { topicKey, title, reason } = req.body
  const plan = spacedRevisionPlan(topicKey, title || topicKey)

  const docs = await Promise.all(
    plan.map((p) => {
      const scheduledFor = new Date()
      scheduledFor.setDate(scheduledFor.getDate() + p.offsetDays)
      return Revision.create({
        user: req.user._id,
        topicKey: p.topicKey,
        reason: reason || `Auto-scheduled after ${title || topicKey} was marked weak`,
        scheduledFor,
        durationMinutes: p.durationMinutes,
        priorityScore: computeRevisionPriority({ lastStudiedAt: null, confidence: 30, importance: 6 }),
      })
    })
  )

  await UserTopicProgress.findOneAndUpdate({ user: req.user._id, topicKey }, { status: 'weak' }, { upsert: true })

  res.status(201).json({ success: true, revisions: docs })
})

export const completeRevision = catchAsync(async (req, res, next) => {
  const revision = await Revision.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { completed: true },
    { new: true }
  )
  if (!revision) return res.status(404).json({ success: false, message: 'Revision not found.' })
  await recordActivityAndXp(req.user._id, 'revision_completed', { revisionId: revision._id })
  res.status(200).json({ success: true, revision })
})
