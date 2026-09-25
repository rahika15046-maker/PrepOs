import { useState } from 'react'
import {
  motion,
  AnimatePresence,
} from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Sparkles,
  Clock3,
  GraduationCap,
  Utensils,
  Dumbbell,
} from 'lucide-react'
import {
  useNavigate,
} from 'react-router-dom'

import PrepOSLogo from '../../components/PrepOSLogo'
import Mascot from '../../components/mascot/Mascot'
import Button from '../../components/ui/Button'
import GlassCard from '../../components/ui/GlassCard'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { clockParams } from '../../lib/dates'

const DEADLINES = [
  '30 Days',
  '45 Days',
  '60 Days',
  '90 Days',
]

const DEADLINE_DAYS = {
  '30 Days': 30,
  '45 Days': 45,
  '60 Days': 60,
  '90 Days': 90,
}

const DAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]

const DEFAULT_DATA = {
  role: '',

  deadline: '',

  wakeTime: '07:00',

  sleepTime: '23:00',

  collegeStart: '09:00',

  collegeEnd: '16:00',

  travelMinutes: 30,

  breakfast: {
    start: '08:00',
    durationMinutes: 30,
  },

  lunch: {
    start: '13:00',
    durationMinutes: 45,
  },

  dinner: {
    start: '20:00',
    durationMinutes: 45,
  },

  exercise: {
    start: '',
    durationMinutes: 0,
  },

  collegeDays: [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
  ],

  fixedEvents: [],
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value
  )
}

function isPositiveDuration(value) {
  const number = Number(value)

  return (
    Number.isFinite(number) &&
    number >= 0 &&
    number <= 300
  )
}

function timeToMinutes(time) {
  const [
    hours,
    minutes,
  ] = time.split(':').map(Number)

  return hours * 60 + minutes
}

function validateTimeBlock(
  block,
  label
) {
  if (!block?.start) {
    return `${label} start time is required.`
  }

  if (!isValidTime(block.start)) {
    return `${label} has an invalid start time.`
  }

  if (
    !isPositiveDuration(
      block.durationMinutes
    )
  ) {
    return `${label} duration must be between 0 and 300 minutes.`
  }

  return ''
}

function validateOnboarding(data) {
  if (!data.role.trim()) {
    return 'Please enter your target technology career.'
  }

  if (
    data.role.trim().length < 3
  ) {
    return 'Please enter a more specific career role.'
  }

  if (!data.deadline) {
    return 'Please choose a preparation deadline.'
  }

  if (
    !isValidTime(data.wakeTime)
  ) {
    return 'Wake time is invalid.'
  }

  if (
    !isValidTime(data.sleepTime)
  ) {
    return 'Sleep time is invalid.'
  }

  const wake =
    timeToMinutes(
      data.wakeTime
    )

  const sleep =
    timeToMinutes(
      data.sleepTime
    )

  if (wake >= sleep) {
    return 'Sleep time must be later than wake time.'
  }

  if (
    !isValidTime(
      data.collegeStart
    ) ||
    !isValidTime(
      data.collegeEnd
    )
  ) {
    return 'College timings are invalid.'
  }

  const collegeStart =
    timeToMinutes(
      data.collegeStart
    )

  const collegeEnd =
    timeToMinutes(
      data.collegeEnd
    )

  if (
    collegeStart >= collegeEnd
  ) {
    return 'College end time must be later than college start time.'
  }

  const travel =
    Number(
      data.travelMinutes
    )

  if (
    !Number.isFinite(travel) ||
    travel < 0 ||
    travel > 300
  ) {
    return 'Travel time must be between 0 and 300 minutes.'
  }

  const blocks = [
    [
      'Breakfast',
      data.breakfast,
    ],
    [
      'Lunch',
      data.lunch,
    ],
    [
      'Dinner',
      data.dinner,
    ],
  ]

  for (
    const [label, block]
    of blocks
  ) {
    const error =
      validateTimeBlock(
        block,
        label
      )

    if (error) {
      return error
    }
  }

  if (
    data.exercise.durationMinutes > 0
  ) {
    const error =
      validateTimeBlock(
        data.exercise,
        'Exercise'
      )

    if (error) {
      return error
    }
  }

  const routineBlocks = [
    [
      'Breakfast',
      data.breakfast,
    ],
    [
      'Lunch',
      data.lunch,
    ],
    [
      'Dinner',
      data.dinner,
    ],
  ]

  if (
    data.exercise.durationMinutes > 0
  ) {
    routineBlocks.push([
      'Exercise',
      data.exercise,
    ])
  }

  for (
    const [label, block]
    of routineBlocks
  ) {
    const start =
      timeToMinutes(
        block.start
      )

    const end =
      start +
      Number(
        block.durationMinutes
      )

    if (
      start < wake ||
      end > sleep
    ) {
      return `${label} must fit inside your waking schedule.`
    }
  }

  if (
    data.collegeDays.length > 0
  ) {
    if (
      collegeStart < wake ||
      collegeEnd > sleep
    ) {
      return 'College must fit inside your waking schedule.'
    }
  }

  return ''
}

export default function Onboarding() {
  const navigate =
    useNavigate()

  const { refresh } =
    useAuth()

  const [
    step,
    setStep,
  ] = useState(0)

  const [
    data,
    setData,
  ] = useState(DEFAULT_DATA)

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    progressMessage,
    setProgressMessage,
  ] = useState('')

  const totalSteps = 5

  function updateField(
    field,
    value
  ) {
    setData((current) => ({
      ...current,
      [field]: value,
    }))

    setError('')
  }

  function updateBlock(
    blockName,
    field,
    value
  ) {
    setData((current) => ({
      ...current,

      [blockName]: {
        ...current[blockName],
        [field]: value,
      },
    }))

    setError('')
  }

  function toggleDay(day) {
    setData((current) => {
      const exists =
        current.collegeDays.includes(
          day
        )

      return {
        ...current,

        collegeDays: exists
          ? current.collegeDays.filter(
              (item) =>
                item !== day
            )
          : [
              ...current.collegeDays,
              day,
            ],
      }
    })

    setError('')
  }

  function validateCurrentStep() {
    setError('')

    if (step === 1) {
      if (!data.role.trim()) {
        return 'Please enter your target career.'
      }

      if (
        data.role.trim().length < 3
      ) {
        return 'Please enter a more specific career role.'
      }
    }

    if (step === 2) {
      if (!data.deadline) {
        return 'Please choose a preparation deadline.'
      }
    }

    if (step === 3) {
      const validation =
        validateOnboarding(data)

      if (validation) {
        return validation
      }
    }

    if (step === 4) {
      const validation =
        validateOnboarding(data)

      if (validation) {
        return validation
      }
    }

    return ''
  }

  async function finish() {
    const validation =
      validateOnboarding(data)

    if (validation) {
      setError(validation)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      /*
       * STEP 1
       * Save the user's real-life constraints.
       *
       * There is intentionally:
       * - no stack
       * - no technology picker
       * - no self-rated skill list
       */
      setProgressMessage(
        'Saving your routine…'
      )

      await api.post(
        '/users/onboarding',
        {
          role:
            data.role.trim(),

          deadlineDays:
            DEADLINE_DAYS[
              data.deadline
            ],

          dailyRhythm: {
            wakeTime:
              data.wakeTime,

            sleepTime:
              data.sleepTime,

            collegeStart:
              data.collegeStart,

            collegeEnd:
              data.collegeEnd,

            travelMinutes:
              Number(
                data.travelMinutes
              ),

            breakfast: {
              start:
                data.breakfast.start,

              durationMinutes:
                Number(
                  data.breakfast
                    .durationMinutes
                ),
            },

            lunch: {
              start:
                data.lunch.start,

              durationMinutes:
                Number(
                  data.lunch
                    .durationMinutes
                ),
            },

            dinner: {
              start:
                data.dinner.start,

              durationMinutes:
                Number(
                  data.dinner
                    .durationMinutes
                ),
            },

            exercise:
              data.exercise
                .start &&
              Number(
                data.exercise
                  .durationMinutes
              ) > 0
                ? {
                    start:
                      data.exercise
                        .start,

                    durationMinutes:
                      Number(
                        data.exercise
                          .durationMinutes
                      ),
                  }
                : undefined,
          },

          collegeDays:
            data.collegeDays,

          fixedEvents:
            data.fixedEvents,
        }
      )

      /*
       * STEP 2
       *
       * AI determines what the selected role actually requires.
       *
       * This replaces the old stack-selection system.
       */
      setProgressMessage(
        'AI is analyzing your target career…'
      )

      await api.post(
        '/career-intelligence/blueprint',
        {
          role:
            data.role.trim(),
        }
      )

      /*
       * STEP 3
       *
       * Create the goal from the AI-generated blueprint.
       */
      setProgressMessage(
        'Building your personalized roadmap…'
      )

      await api.post(
        '/goals',
        {}
      )

      /*
       * STEP 4
       *
       * Generate the schedule using:
       * - AI roadmap
       * - deadline
       * - college
       * - meals
       * - exercise
       * - travel
       * - fixed events
       */
      setProgressMessage(
        'Creating your adaptive schedule…'
      )

      await api.post(
        '/schedule/generate',
        clockParams()
      )

      /*
       * Refresh authentication/user state.
       */
      setProgressMessage(
        'Finishing your PrepOS setup…'
      )

      await refresh()

      navigate('/app')
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Could not build your PrepOS plan. Please retry.'

      setError(message)
    } finally {
      setSubmitting(false)
      setProgressMessage('')
    }
  }

  function next() {
    const validation =
      validateCurrentStep()

    if (validation) {
      setError(validation)
      return
    }

    if (
      step <
      totalSteps - 1
    ) {
      setStep(
        (current) =>
          current + 1
      )

      return
    }

    finish()
  }

  function back() {
    if (
      submitting ||
      step === 0
    ) {
      return
    }

    setError('')

    setStep(
      (current) =>
        current - 1
    )
  }

  return (
    <div className="min-h-screen bg-void bg-grid flex flex-col items-center px-4 py-10">

      <PrepOSLogo />

      <div className="w-full max-w-2xl mt-8 mb-6">

        <div className="flex gap-1.5">
          {Array.from({
            length: totalSteps,
          }).map((_, index) => (
            <div
              key={index}
              className={[
                'h-1 flex-1 rounded-full transition-all',
                index <= step
                  ? 'bg-gradient-to-r from-blue-500 to-violet-500'
                  : 'bg-white/10',
              ].join(' ')}
            />
          ))}
        </div>

        <p className="text-[11px] text-ink-faint mt-2">
          Step {step + 1} of {totalSteps}
        </p>
      </div>

      <GlassCard className="w-full max-w-2xl p-8">

        <AnimatePresence mode="wait">

          <motion.div
            key={step}
            initial={{
              opacity: 0,
              x: 24,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: -24,
            }}
            transition={{
              duration: 0.25,
            }}
          >

            {/* ---------------------------------------------------------- */}
            {/* STEP 0                                                      */}
            {/* ---------------------------------------------------------- */}

            {step === 0 && (
              <div className="text-center py-6">

                <Mascot
                  size={140}
                  className="mx-auto mb-4"
                />

                <h2 className="font-display text-2xl font-semibold text-white">
                  Welcome to PrepOS
                </h2>

                <p className="text-ink-dim mt-2 max-w-md mx-auto text-sm leading-6">
                  PrepOS builds a personalized
                  technology-career preparation
                  system around your target role,
                  current ability, deadline and
                  real daily routine.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">

                  <InfoCard
                    icon={Sparkles}
                    title="AI Career Intelligence"
                    text="AI determines the technologies, skills, DSA and interview areas your role actually needs."
                  />

                  <InfoCard
                    icon={GraduationCap}
                    title="Verified Learning"
                    text="Your progress is confirmed through assessments instead of trusting self-reported mastery."
                  />

                  <InfoCard
                    icon={Clock3}
                    title="Adaptive Schedule"
                    text="Your learning plan fits around college, travel, meals, exercise and fixed events."
                  />

                </div>

              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* STEP 1                                                      */}
            {/* ---------------------------------------------------------- */}

            {step === 1 && (
              <div>

                <div className="flex items-center gap-2 mb-2">

                  <Sparkles
                    size={17}
                    className="text-violet-300"
                  />

                  <h2 className="font-display text-lg font-semibold text-white">
                    What technology career do you want?
                  </h2>

                </div>

                <p className="text-xs text-ink-faint mb-5 leading-5">
                  Enter the role you want to prepare
                  for. You do not need to choose a
                  technology stack. PrepOS AI will
                  determine what the role requires.
                </p>

                <input
                  autoFocus
                  value={data.role}
                  onChange={(event) =>
                    updateField(
                      'role',
                      event.target.value
                    )
                  }
                  placeholder="e.g. Backend Engineer"
                  maxLength={150}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 text-white py-3 px-4 text-sm outline-none focus:border-violet-400/50"
                />

                <div className="mt-4 flex flex-wrap gap-2">

                  {[
                    'Frontend Engineer',
                    'Backend Engineer',
                    'DevOps Engineer',
                    'Cybersecurity Engineer',
                    'Data Analyst',
                    'Machine Learning Engineer',
                    'Cloud Engineer',
                    'SRE',
                  ].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() =>
                        updateField(
                          'role',
                          role
                        )
                      }
                      className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-xs text-ink-dim hover:border-violet-400/40 hover:text-white transition-colors"
                    >
                      {role}
                    </button>
                  ))}

                </div>

                <div className="mt-5 rounded-xl bg-violet-500/10 border border-violet-400/10 p-4">

                  <div className="flex gap-2">

                    <Sparkles
                      size={15}
                      className="text-violet-300 shrink-0 mt-0.5"
                    />

                    <p className="text-xs text-ink-dim leading-5">
                      <span className="text-white font-medium">
                        No stack picker.
                      </span>{' '}
                      If you choose DevOps, PrepOS
                      will determine DevOps requirements.
                      If you choose ML Engineer, it will
                      determine ML requirements.
                    </p>

                  </div>

                </div>

              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* STEP 2                                                      */}
            {/* ---------------------------------------------------------- */}

            {step === 2 && (
              <div>

                <h2 className="font-display text-lg font-semibold text-white mb-1">
                  When do you want to become job-ready?
                </h2>

                <p className="text-xs text-ink-faint mb-5">
                  This controls the pacing of your
                  preparation. It does not change the
                  AI-generated role requirements.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                  {DEADLINES.map(
                    (deadline) => (
                      <button
                        key={deadline}
                        type="button"
                        onClick={() =>
                          updateField(
                            'deadline',
                            deadline
                          )
                        }
                        className={[
                          'text-sm py-4 rounded-xl border transition-colors',
                          data.deadline ===
                          deadline
                            ? 'border-violet-400/50 bg-violet-500/10 text-white'
                            : 'border-white/10 bg-white/[0.02] text-ink-dim hover:border-white/20',
                        ].join(' ')}
                      >
                        {deadline}
                      </button>
                    )
                  )}

                </div>

              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* STEP 3                                                      */}
            {/* ---------------------------------------------------------- */}

            {step === 3 && (
              <div>

                <div className="flex items-center gap-2 mb-1">

                  <GraduationCap
                    size={17}
                    className="text-blue-300"
                  />

                  <h2 className="font-display text-lg font-semibold text-white">
                    Your fixed routine
                  </h2>

                </div>

                <p className="text-xs text-ink-faint mb-5">
                  PrepOS will schedule study around
                  these real-world constraints.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">

                  <TimeInput
                    label="Wake time"
                    value={data.wakeTime}
                    onChange={(value) =>
                      updateField(
                        'wakeTime',
                        value
                      )
                    }
                  />

                  <TimeInput
                    label="Sleep time"
                    value={data.sleepTime}
                    onChange={(value) =>
                      updateField(
                        'sleepTime',
                        value
                      )
                    }
                  />

                  <TimeInput
                    label="College start"
                    value={data.collegeStart}
                    onChange={(value) =>
                      updateField(
                        'collegeStart',
                        value
                      )
                    }
                  />

                  <TimeInput
                    label="College end"
                    value={data.collegeEnd}
                    onChange={(value) =>
                      updateField(
                        'collegeEnd',
                        value
                      )
                    }
                  />

                  <NumberInput
                    label="Travel time — one way"
                    value={data.travelMinutes}
                    min={0}
                    max={300}
                    suffix="minutes"
                    onChange={(value) =>
                      updateField(
                        'travelMinutes',
                        value
                      )
                    }
                  />

                </div>

                <div className="mt-6">

                  <span className="block text-xs text-ink-dim mb-2">
                    College days
                  </span>

                  <div className="flex flex-wrap gap-2">

                    {DAYS.map(
                      (day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            toggleDay(day)
                          }
                          className={[
                            'px-3 py-2 rounded-lg border text-xs transition-colors',
                            data.collegeDays.includes(
                              day
                            )
                              ? 'border-blue-400/50 bg-blue-500/10 text-white'
                              : 'border-white/10 text-ink-faint hover:border-white/20',
                          ].join(' ')}
                        >
                          {day}
                        </button>
                      )
                    )}

                  </div>

                </div>

              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* STEP 4                                                      */}
            {/* ---------------------------------------------------------- */}

            {step === 4 && (
              <div>

                <div className="flex items-center gap-2 mb-1">

                  <Utensils
                    size={17}
                    className="text-emerald-300"
                  />

                  <h2 className="font-display text-lg font-semibold text-white">
                    Meals & exercise
                  </h2>

                </div>

                <p className="text-xs text-ink-faint mb-5">
                  These are actual blocked periods,
                  not an estimated daily total. This
                  prevents the scheduler from guessing.
                </p>

                <div className="space-y-4">

                  <RoutineBlock
                    label="Breakfast"
                    block={data.breakfast}
                    onChange={(field, value) =>
                      updateBlock(
                        'breakfast',
                        field,
                        value
                      )
                    }
                  />

                  <RoutineBlock
                    label="Lunch"
                    block={data.lunch}
                    onChange={(field, value) =>
                      updateBlock(
                        'lunch',
                        field,
                        value
                      )
                    }
                  />

                  <RoutineBlock
                    label="Dinner"
                    block={data.dinner}
                    onChange={(field, value) =>
                      updateBlock(
                        'dinner',
                        field,
                        value
                      )
                    }
                  />

                  <div className="pt-4 border-t border-white/[0.06]">

                    <div className="flex items-center gap-2 mb-3">

                      <Dumbbell
                        size={15}
                        className="text-orange-300"
                      />

                      <span className="text-sm text-white">
                        Exercise
                      </span>

                      <span className="text-[11px] text-ink-faint">
                        optional
                      </span>

                    </div>

                    <div className="grid grid-cols-2 gap-3">

                      <TimeInput
                        label="Start"
                        value={
                          data.exercise.start
                        }
                        onChange={(value) =>
                          updateBlock(
                            'exercise',
                            'start',
                            value
                          )
                        }
                      />

                      <NumberInput
                        label="Duration"
                        value={
                          data.exercise
                            .durationMinutes
                        }
                        min={0}
                        max={300}
                        suffix="minutes"
                        onChange={(value) =>
                          updateBlock(
                            'exercise',
                            'durationMinutes',
                            value
                          )
                        }
                      />

                    </div>

                  </div>

                </div>

                <div className="mt-5 flex items-start gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-400/10 rounded-xl px-4 py-3">

                  <Check
                    size={14}
                    className="shrink-0 mt-0.5"
                  />

                  <span>
                    AI decides what you need to
                    learn. The deterministic scheduler
                    decides where that work can safely
                    fit into your real day.
                  </span>

                </div>

              </div>
            )}

          </motion.div>

        </AnimatePresence>

        {/* -------------------------------------------------------------- */}
        {/* ERROR                                                          */}
        {/* -------------------------------------------------------------- */}

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-3 mt-6">

            <AlertCircle
              size={14}
              className="shrink-0 mt-0.5"
            />

            <span>
              {error}
            </span>

          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* AI PROGRESS                                                    */}
        {/* -------------------------------------------------------------- */}

        {submitting &&
          progressMessage && (
            <div className="mt-5 rounded-xl bg-violet-500/10 border border-violet-400/10 px-4 py-3">

              <div className="flex items-center gap-2">

                <Sparkles
                  size={14}
                  className="text-violet-300 animate-pulse"
                />

                <span className="text-xs text-violet-200">
                  {progressMessage}
                </span>

              </div>

            </div>
          )}

        {/* -------------------------------------------------------------- */}
        {/* BUTTONS                                                        */}
        {/* -------------------------------------------------------------- */}

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">

          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={back}
            disabled={
              step === 0 ||
              submitting
            }
          >
            Back
          </Button>

          <Button
            size="sm"
            icon={ArrowRight}
            iconPosition="right"
            onClick={next}
            disabled={submitting}
          >
            {submitting
              ? 'Building your plan…'
              : step ===
                  totalSteps - 1
                ? 'Build my AI plan'
                : 'Continue'}
          </Button>

        </div>

      </GlassCard>

    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Small UI components                                                        */
/* -------------------------------------------------------------------------- */

function InfoCard({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-4">

      <Icon
        size={17}
        className="text-violet-300 mb-3"
      />

      <h3 className="text-xs font-medium text-white">
        {title}
      </h3>

      <p className="text-[11px] text-ink-faint leading-5 mt-1.5">
        {text}
      </p>

    </div>
  )
}

function TimeInput({
  label,
  value,
  onChange,
}) {
  return (
    <label className="block">

      <span className="block text-xs text-ink-dim mb-1.5">
        {label}
      </span>

      <input
        type="time"
        value={value || ''}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl bg-white/[0.04] border border-white/10 text-white py-2.5 px-3.5 text-sm outline-none focus:border-violet-400/50"
      />

    </label>
  )
}

function NumberInput({
  label,
  value,
  min = 0,
  max = 300,
  suffix,
  onChange,
}) {
  return (
    <label className="block">

      <span className="block text-xs text-ink-dim mb-1.5">
        {label}
      </span>

      <div className="relative">

        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) =>
            onChange(
              Number(
                event.target.value
              )
            )
          }
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 text-white py-2.5 px-3.5 pr-20 text-sm outline-none focus:border-violet-400/50"
        />

        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ink-faint">
            {suffix}
          </span>
        )}

      </div>

    </label>
  )
}

function RoutineBlock({
  label,
  block,
  onChange,
}) {
  return (
    <div>

      <span className="block text-sm text-white mb-2">
        {label}
      </span>

      <div className="grid grid-cols-2 gap-3">

        <TimeInput
          label="Start"
          value={block.start}
          onChange={(value) =>
            onChange(
              'start',
              value
            )
          }
        />

        <NumberInput
          label="Duration"
          value={
            block.durationMinutes
          }
          min={0}
          max={300}
          suffix="minutes"
          onChange={(value) =>
            onChange(
              'durationMinutes',
              value
            )
          }
        />

      </div>

    </div>
  )
}