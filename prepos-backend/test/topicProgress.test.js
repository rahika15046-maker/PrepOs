import { test } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import UserTopicProgress from '../src/models/UserTopicProgress.js'

// Regression test for a real bug found during audit: markSubtopicComplete
// used to set status: 'assessment_required' when a topic's subtopics were
// all individually quiz-verified (progress reaches 100%). That value was
// never added to the schema's enum, so the write silently failed Mongoose
// validation — which meant a topic could never reach 'completed', which
// meant prerequisitesMet() (gating every downstream topic/subtopic) could
// never return true for any prerequisite. The whole roadmap-progression
// chain was broken. Fixed by setting 'completed' directly, since every
// subtopic reaching that point has already individually passed its own
// >=60% confirmation quiz (see quizController.js / topicProgressService.js).

test('UserTopicProgress accepts "completed" as a valid status', () => {
  const doc = new UserTopicProgress({
    user: new mongoose.Types.ObjectId(),
    topicKey: 'javascript-fundamentals',
    status: 'completed',
    progress: 100,
  })
  const error = doc.validateSync()
  assert.equal(error, undefined, 'a fully-verified topic must be able to reach "completed"')
})

test('UserTopicProgress rejects the old, invalid "assessment_required" status', () => {
  const doc = new UserTopicProgress({
    user: new mongoose.Types.ObjectId(),
    topicKey: 'some-topic',
    status: 'assessment_required',
    progress: 100,
  })
  const error = doc.validateSync()
  assert.ok(error, 'this value was never a valid enum member — if this ever stops erroring, someone re-added the old bug')
  assert.match(error.errors.status.message, /not a valid enum value/)
})

test('every status the app actually writes is a valid enum member', () => {
  // Cross-check against the enum itself so this test fails loudly if the
  // schema and the app's write sites ever drift apart again.
  const writtenElsewhere = ['locked', 'upcoming', 'current', 'completed', 'weak']
  const enumValues = UserTopicProgress.schema.path('status').enumValues
  for (const value of writtenElsewhere) {
    assert.ok(enumValues.includes(value), `"${value}" must remain a valid status`)
  }
})
