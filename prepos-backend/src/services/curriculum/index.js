import { CORE_CS_TOPICS, CORE_CS_MATCHERS } from './coreCs.js'
import { DSA_TOPICS } from './dsa.js'
import { PROJECT_TOPIC, CAREER_TOPICS } from './career.js'

export { CORE_CS_TOPICS, DSA_TOPICS, PROJECT_TOPIC, CAREER_TOPICS }

const clone = (value) => JSON.parse(JSON.stringify(value))

/** Which curated Core-CS topics does this role need? */
export function selectCoreCsTopics({ csSubjects = [], role = '' } = {}) {
  const wanted = new Set()

  for (const subject of csSubjects) {
    const name = String(subject?.name || subject || '')
    for (const matcher of CORE_CS_MATCHERS) {
      if (matcher.test.test(name)) wanted.add(matcher.id)
    }
  }

  // Every technical student should have the four classics.
  if (wanted.size < 3) {
    ;['oop', 'dbms', 'os', 'cn'].forEach((id) => wanted.add(id))
  }

  if (
    /(backend|full ?stack|software|sde|engineer|developer|cloud|devops|architect)/i.test(role)
  ) {
    wanted.add('systemDesign')
  }

  const order = ['oop', 'dbms', 'os', 'cn', 'systemDesign']
  return order.filter((id) => wanted.has(id)).map((id) => clone(CORE_CS_TOPICS[id]))
}

export const getDsaTopics = () => clone(DSA_TOPICS)
export const getProjectTopic = () => clone(PROJECT_TOPIC)
export const getCareerTopics = () => clone(CAREER_TOPICS)

const SEARCH = {
  video: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  default: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
}

/** Turns {title,type,query} into a stored resource with a safe search URL. */
export function resourceWithUrl(resource) {
  const query = resource.query || resource.title
  const build = SEARCH[resource.type] || SEARCH.default
  return {
    title: resource.title,
    type: ['documentation', 'video', 'course', 'article', 'book', 'practice'].includes(resource.type)
      ? resource.type
      : 'other',
    url: build(query),
  }
}
