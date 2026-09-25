import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { clockParams } from '../lib/dates'

const qs = () => new URLSearchParams(clockParams()).toString()

/**
 * Loads the plan overview and — the moment the app opens on a new day (or after
 * missed sessions) — automatically carries unfinished work forward, so the
 * learner never has to press "regenerate" to recover from a missed day.
 */
export default function usePlanSync() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [version, setVersion] = useState(0)
  const autoSynced = useRef(false)

  const load = useCallback(async ({ allowAuto = true } = {}) => {
    setError('')
    try {
      let data = await api.get(`/schedule/overview?${qs()}`)

      if (data.needsSync && allowAuto && !autoSynced.current) {
        autoSynced.current = true
        setSyncing(true)
        const result = await api.post('/schedule/rollover', clockParams())
        data = await api.get(`/schedule/overview?${qs()}`)
        setNotice(
          result.missedRescheduled
            ? `Welcome back — ${result.missedRescheduled} unfinished session${result.missedRescheduled > 1 ? 's were' : ' was'} moved forward and your plan was re-balanced.`
            : 'Your plan was refreshed for today.'
        )
      }

      setOverview(data)
      setVersion((v) => v + 1)
    } catch (err) {
      setError(err.message || 'Unable to load your plan.')
    } finally {
      setSyncing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const regenerate = useCallback(async () => {
    setSyncing(true)
    setError('')
    try {
      const result = await api.post('/schedule/generate', clockParams())
      setNotice(
        result.summary?.overflowDays > 0
          ? `Plan rebuilt. At your current availability you finish ${result.summary.overflowDays} day(s) after your deadline.`
          : 'Plan rebuilt from today through your deadline.'
      )
      await load({ allowAuto: false })
    } catch (err) {
      setError(err.message || 'Unable to rebuild the plan.')
      setSyncing(false)
    }
  }, [load])

  return {
    overview,
    error,
    notice,
    syncing,
    version,
    reload: () => load({ allowAuto: false }),
    regenerate,
    dismissNotice: () => setNotice(''),
  }
}
