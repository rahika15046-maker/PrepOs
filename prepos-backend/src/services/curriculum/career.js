import { S, R, topic } from './helpers.js'

/** Final phases every learner needs to become job-ready. */
export const PROJECT_TOPIC = topic({
  key: 'career-portfolio-projects',
  title: 'Portfolio Projects',
  stage: 'Projects & Portfolio',
  track: 'project',
  difficulty: 'intermediate',
  importance: 9,
  description:
    'Ship real, deployed projects that prove you can build — the strongest signal on a fresher resume.',
  outcomes: [
    'Plan, build and deploy at least two role-relevant projects',
    'Explain every design decision in your projects during interviews',
    'Publish clean READMEs, demos and case studies',
  ],
  subtopicDetails: [
    S('Choosing & Scoping a Project', 2, 'Pick something that signals the right skills.', ['Map project to target role', 'MVP scope & user stories', 'Tech choices with reasoning', 'Milestones & timeline', 'Avoiding tutorial clones']),
    S('Build the MVP', 12, 'Ship a working core.', ['Repository & branching setup', 'Core features', 'Authentication & data layer (if relevant)', 'Error handling & validation', 'Commit hygiene']),
    S('Testing & Quality', 3, 'Make it reliable.', ['Unit & integration tests', 'Linting & formatting', 'Manual QA checklist', 'Logging']),
    S('Deployment & CI/CD', 3, 'Get it live.', ['Hosting options', 'Environment variables & secrets', 'CI pipeline', 'Domain & HTTPS', 'Monitoring']),
    S('Documentation & Case Study', 2.5, 'Turn code into a story.', ['README with screenshots/GIF', 'Architecture diagram', 'Problem → approach → result', 'Demo video', 'Resume bullet points']),
    S('Second Project: Depth & Differentiation', 12, 'A project that shows range.', ['Different domain or stack', 'Performance / scale story', 'Open-source contribution option']),
  ],
  resources: [
    R('Project ideas for your target role', 'article', 'portfolio project ideas for fresher developers'),
    R('How to write a great README', 'article', 'how to write a good github readme'),
  ],
  interviewFocus: [
    'Walk me through your best project end to end',
    'What was the hardest bug and how did you fix it?',
    'What would you change if this had 1M users?',
  ],
  miniProject: 'Deploy your flagship project with a live URL, CI pipeline and a 2-minute demo video.',
})

export const CAREER_TOPICS = [
  topic({
    key: 'career-resume-profiles',
    title: 'Resume, GitHub & LinkedIn',
    stage: 'Career Launch',
    track: 'career',
    difficulty: 'beginner',
    importance: 8,
    prerequisites: [],
    description: 'Get past ATS filters and make recruiters stop scrolling.',
    outcomes: ['One-page ATS-friendly resume', 'Polished GitHub and LinkedIn presence'],
    subtopicDetails: [
      S('ATS-Friendly Resume', 3, 'Structure that gets shortlisted.', ['One-page format', 'Impact-driven bullet points (action + metric)', 'Skills section keywords', 'Projects vs experience ordering', 'Tailoring per job']),
      S('GitHub Profile & Repositories', 2, 'Your public portfolio.', ['Profile README', 'Pinned repos', 'Commit consistency', 'Clean repository structure']),
      S('LinkedIn Optimisation', 2, 'Be findable by recruiters.', ['Headline & about', 'Featured section', 'Skills & endorsements', 'Recruiter keywords', 'Posting about your learning']),
      S('Portfolio Website (Optional)', 3, 'A home for your work.', ['Case-study pages', 'Contact & resume link', 'Performance & accessibility']),
    ],
    resources: [
      R('Resume templates for freshers', 'article', 'ats friendly resume template fresher software engineer'),
      R('LinkedIn profile tips for developers', 'video', 'linkedin profile tips software developer'),
    ],
  }),
  topic({
    key: 'interview-technical',
    title: 'Technical Interview Mastery',
    stage: 'Interview Preparation',
    track: 'interview',
    difficulty: 'advanced',
    importance: 9,
    description: 'Communicate your thinking under pressure — the skill that converts knowledge into offers.',
    outcomes: ['Think aloud clearly while coding', 'Handle unknown questions with structured reasoning', 'Answer role-specific fundamentals confidently'],
    subtopicDetails: [
      S('Coding Interview Communication', 3, 'Show your process.', ['Clarifying questions', 'Explaining brute force → optimal', 'Complexity discussion', 'Testing your own code', 'Recovering from mistakes']),
      S('Role-Specific Fundamentals Drill', 6, 'Rapid-fire theory.', ['Top 50 questions for your role', 'Explain-it-simply practice', 'Diagram-based answers', 'Common misconceptions']),
      S('Live Coding & Debugging', 4, 'Working in real conditions.', ['Timed problem solving', 'Reading unfamiliar code', 'Debugging a failing test', 'Take-home assignments']),
      S('System Design Interview Format', 3, 'Structure for open-ended design.', ['Requirements → estimates → API → data → scale', 'Drawing clear diagrams', 'Discussing trade-offs']),
    ],
    resources: [
      R('Mock technical interview examples', 'video', 'mock technical interview software engineer'),
      R('Pramp / peer mock interviews', 'practice', 'free mock interview practice platform'),
    ],
  }),
  topic({
    key: 'interview-behavioral',
    title: 'Behavioral & HR Interviews',
    stage: 'Interview Preparation',
    track: 'interview',
    difficulty: 'beginner',
    importance: 7,
    description: 'Tell your story with structure and confidence.',
    outcomes: ['Five polished STAR stories', 'Confident answers to the standard HR questions', 'A clear approach to offers and negotiation'],
    subtopicDetails: [
      S('STAR Method & Story Bank', 3, 'Structure your answers.', ['Situation-Task-Action-Result', 'Conflict story', 'Failure story', 'Leadership / teamwork story', 'Deadline pressure story']),
      S('Common HR Questions', 2, 'Prepare the predictable.', ['Tell me about yourself', 'Why this company / role', 'Strengths & weaknesses', 'Where do you see yourself in 5 years', 'Gap or low-marks questions']),
      S('Offers & Negotiation', 2, 'Evaluate and respond.', ['Reading an offer (CTC vs in-hand)', 'Negotiation basics', 'Notice periods & bonds', 'Comparing offers']),
    ],
    resources: [R('STAR method examples', 'video', 'STAR method behavioral interview examples')],
  }),
  topic({
    key: 'interview-mock-rounds',
    title: 'Mock Interviews & Final Polish',
    stage: 'Interview Preparation',
    track: 'interview',
    difficulty: 'advanced',
    importance: 9,
    prerequisites: ['interview-technical', 'interview-behavioral'],
    description: 'Simulated interviews with feedback until nothing surprises you.',
    subtopicDetails: [
      S('PrepOS AI Mock Interviews', 6, 'Practise with instant feedback.', ['Technical rounds', 'CS fundamentals rounds', 'Project deep-dives', 'Behavioural rounds', 'Review weak areas after each mock']),
      S('Peer & Mentor Mocks', 3, 'Human feedback.', ['Schedule 3 peer mocks', 'Record & review yourself', 'Body language & pacing']),
      S('Final Revision Sprint', 4, 'Consolidate.', ['One-page cheat sheets', 'Revisit weak topics from quiz history', 'Company-specific preparation']),
    ],
    resources: [R('Mock interview platforms', 'practice', 'mock interview platform software engineer free')],
  }),
  topic({
    key: 'career-job-search',
    title: 'Job Search & Applications',
    stage: 'Career Launch',
    track: 'career',
    difficulty: 'beginner',
    importance: 8,
    prerequisites: ['career-resume-profiles'],
    description: 'A repeatable, tracked process for getting interviews.',
    outcomes: ['A weekly application routine', 'A referral and outreach strategy', 'Every application tracked in PrepOS'],
    subtopicDetails: [
      S('Finding the Right Roles', 2, 'Where and how to search.', ['Job boards & company career pages', 'Campus placements & off-campus drives', 'Startups vs product vs service companies', 'Filtering by fit']),
      S('Applications & Tracking', 2, 'Volume with quality.', ['Tailoring resume per job', 'Application tracker discipline', 'Follow-up cadence', 'Reading job descriptions for keywords']),
      S('Networking & Referrals', 2.5, 'Warm beats cold.', ['Cold messages that get replies', 'Alumni & community outreach', 'Asking for referrals politely', 'Open-source & events']),
    ],
    resources: [R('How to get referrals as a fresher', 'article', 'how to get referral fresher software job')],
  }),
]
