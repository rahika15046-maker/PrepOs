import { test } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import ScheduleEvent from '../src/models/ScheduleEvent.js'

// Regression guard: the scheduler marks a past, never-actioned block as
// 'Missed' (see planService.rebuildPlanUnsafe) so it can be re-planned instead
// of silently vanishing. Confirms that value is a real enum member and that
// every status the app actually writes stays in sync with the schema.
test('ScheduleEvent status enum includes every value the app writes', () => {
  const writtenElsewhere = ['Not Started', 'In Progress', 'Completed', 'Partially Completed', 'Skipped', 'Missed']
  const enumValues = ScheduleEvent.schema.path('status').enumValues
  for (const value of writtenElsewhere) {
    assert.ok(enumValues.includes(value), `"${value}" must remain a valid ScheduleEvent status`)
  }
})

test('a "Missed" event validates and can carry a carryOver count', () => {
  const doc = new ScheduleEvent({
    user: new mongoose.Types.ObjectId(),
    date: new Date(),
    start: '09:00',
    end: '09:45',
    title: 'Arrays — sliding window',
    type: 'dsa',
    topicKey: 'dsa-arrays-strings',
    subtopic: 'Sliding Window',
    carryOver: 1,
    status: 'Missed',
  })
  const error = doc.validateSync()
  assert.equal(error, undefined)
})
