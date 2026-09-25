import 'dotenv/config'
import { connectDB } from '../config/db.js'
import mongoose from 'mongoose'
import Role from '../models/Role.js'
import Topic from '../models/Topic.js'
import DSAProblem from '../models/DSAProblem.js'

const ROLES = [
  {
    name: 'Software Engineer',
    category: 'software-development',
    description:
      'Builds and maintains software systems and applications.',
  },

  {
    name: 'Frontend Developer',
    category: 'software-development',
    description:
      'Builds user-facing web interfaces and frontend applications.',
  },

  {
    name: 'Backend Developer',
    category: 'software-development',
    description:
      'Builds server-side systems, APIs, services and data layers.',
  },

  {
    name: 'Full Stack Developer',
    category: 'software-development',
    description:
      'Builds complete applications across frontend, backend and data layers.',
  },

  {
    name: 'Data Analyst',
    category: 'data',
    description:
      'Analyzes data to produce insights that support business and technical decisions.',
  },

  {
    name: 'Data Engineer',
    category: 'data',
    description:
      'Designs and maintains data pipelines, platforms and data infrastructure.',
  },

  {
    name: 'DevOps Engineer',
    category: 'cloud-infrastructure',
    description:
      'Automates software delivery and operates reliable development and infrastructure systems.',
  },

  {
    name: 'Cloud Engineer',
    category: 'cloud-infrastructure',
    description:
      'Designs, deploys and operates cloud infrastructure and services.',
  },

  {
    name: 'Android Developer',
    category: 'mobile-development',
    description:
      'Builds native Android applications.',
  },

  {
    name: 'React Native Developer',
    category: 'mobile-development',
    description:
      'Builds cross-platform mobile applications using React Native.',
  },

  {
    name: 'Flutter Developer',
    category: 'mobile-development',
    description:
      'Builds cross-platform mobile applications using Flutter.',
  },

  {
    name: 'Java Developer',
    category: 'software-development',
    description:
      'Builds software and backend systems using the Java ecosystem.',
  },

  {
    name: 'Python Developer',
    category: 'software-development',
    description:
      'Builds software, automation and backend systems using Python.',
  },

  {
    name: 'AI Engineer',
    category: 'artificial-intelligence',
    description:
      'Builds AI-powered software systems and integrates machine intelligence into products.',
  },

  {
    name: 'Machine Learning Engineer',
    category: 'artificial-intelligence',
    description:
      'Builds, evaluates and deploys machine-learning systems.',
  },

  {
    name: 'Cybersecurity Engineer',
    category: 'cybersecurity',
    description:
      'Designs and operates security controls, detection and protection systems.',
  },
]
const TOPICS = [
  {
    key: 'foundation', title: 'Foundation', stage: 'Foundation', order: 1, prerequisites: [], importance: 8, estimatedHours: 14,
    subtopics: [
      'Programming fundamentals (variables, loops, functions)',
      'Version control with Git', 'GitHub workflows (branches, PRs, merges)',
      'Command line basics', 'How the web works (HTTP, DNS, client-server)',
      'Choosing and setting up your dev environment',
    ],
  },
  {
    key: 'frontend-basics', title: 'Frontend (HTML, CSS, JS)', stage: 'Frontend', order: 2, prerequisites: ['foundation'], importance: 8, estimatedHours: 35,
    subtopics: [
      'Semantic HTML', 'CSS box model & layout', 'Flexbox', 'CSS Grid', 'Responsive design & media queries',
      'CSS specificity & the cascade', 'JavaScript syntax & control flow', 'The DOM and DOM manipulation',
      'Events & event delegation', 'Basic accessibility (a11y)',
    ],
  },
  {
    key: 'javascript', title: 'JavaScript', stage: 'Frontend', order: 3, prerequisites: ['frontend-basics'], importance: 9, estimatedHours: 30,
    subtopics: [
      'Arrays & array methods (map/filter/reduce)', 'Objects & prototypes', 'Closures', 'Scope & hoisting',
      'this keyword & binding', 'Promises', 'Async/await', 'Event loop & microtasks',
      'ES6+ features (destructuring, spread, modules)', 'Error handling (try/catch)',
    ],
  },
  {
    key: 'react', title: 'React', stage: 'React', order: 4, prerequisites: ['javascript'], importance: 9, estimatedHours: 40,
    subtopics: [
      'Components & JSX', 'Props', 'State (useState)', 'Component lifecycle & useEffect',
      'Conditional rendering & lists', 'Forms & controlled inputs', 'Context API', 'Custom hooks',
      'React Router', 'Performance (memo, useMemo, useCallback)', 'API integration & data fetching',
      'State management patterns (Redux/Zustand basics)',
    ],
  },
  {
    key: 'backend', title: 'Backend (Node.js, Express)', stage: 'Backend', order: 5, prerequisites: ['javascript'], importance: 8, estimatedHours: 35,
    subtopics: [
      'Node.js runtime & event loop', 'Express routing & middleware', 'REST API design principles',
      'Request validation', 'Authentication (JWT)', 'Authorization & protected routes',
      'Error handling middleware', 'File uploads', 'Environment variables & config', 'Rate limiting & security basics',
    ],
  },
  {
    key: 'database', title: 'Database (MongoDB)', stage: 'Database', order: 6, prerequisites: ['backend'], importance: 7, estimatedHours: 22,
    subtopics: [
      'MongoDB documents & collections', 'Mongoose schemas', 'Schema design & relationships',
      'Indexes & query performance', 'Aggregation pipeline', 'Transactions', 'CRUD operations at scale',
    ],
  },
  {
    key: 'tools', title: 'Tools (Git, Deployment)', stage: 'Tools', order: 7, prerequisites: ['database'], importance: 6, estimatedHours: 14,
    subtopics: [
      'Advanced Git workflows (rebase, cherry-pick)', 'CI/CD basics', 'Environment configs (dev/staging/prod)',
      'Deploying a frontend (Vercel/Netlify)', 'Deploying a backend (Render/Railway)', 'Basic Docker concepts',
    ],
  },
  {
    key: 'dsa', title: 'DSA & Problem Solving', stage: 'DSA & CS', order: 8, prerequisites: ['foundation'], importance: 9, estimatedHours: 70,
    subtopics: [
      'Arrays', 'Strings', 'Two Pointers', 'Sliding Window', 'Linked Lists', 'Stacks', 'Queues',
      'Binary Search', 'Recursion & Backtracking', 'Trees & Binary Search Trees', 'Heaps & Priority Queues',
      'Graphs (BFS/DFS)', 'Topological Sort', 'Union-Find', 'Dynamic Programming', 'Greedy Algorithms',
      'Bit Manipulation', 'Time & Space Complexity Analysis',
    ],
  },
  {
    key: 'projects', title: 'Projects', stage: 'Projects', order: 9, prerequisites: ['react', 'backend', 'database'], importance: 8, estimatedHours: 45,
    subtopics: [
      'Planning a full-stack project', 'Building a REST API for it', 'Connecting frontend to backend',
      'Authentication end-to-end', 'Deploying the full stack', 'Writing a strong README',
      'Adding tests', 'Polishing UI/UX for a portfolio piece',
    ],
  },
  {
    key: 'interview-prep', title: 'Interview Preparation', stage: 'Interview Preparation', order: 10, prerequisites: ['dsa', 'projects'], importance: 9, estimatedHours: 30,
    subtopics: [
      'Resume tailored to target role', 'Explaining your projects clearly', 'Common DSA interview patterns',
      'System design basics', 'Behavioral interview prep (STAR method)', 'Mock interviews', 'Salary negotiation basics',
      'Company/role research',
    ],
  },
]

const DSA_PROBLEMS = [
  ['Two Sum', 'Arrays', 'Easy'], ['Best Time to Buy and Sell Stock', 'Arrays', 'Easy'], ['Contains Duplicate', 'Arrays', 'Easy'],
  ['Product of Array Except Self', 'Arrays', 'Medium'], ['Maximum Subarray', 'Arrays', 'Medium'],
  ['Valid Anagram', 'Strings', 'Easy'], ['Valid Palindrome', 'Strings', 'Easy'], ['Longest Substring Without Repeating Characters', 'Strings', 'Medium'],
  ['Reverse Linked List', 'Linked Lists', 'Easy'], ['Merge Two Sorted Lists', 'Linked Lists', 'Easy'], ['Linked List Cycle', 'Linked Lists', 'Easy'],
  ['Valid Parentheses', 'Stack', 'Easy'], ['Min Stack', 'Stack', 'Medium'],
  ['Implement Queue using Stacks', 'Queue', 'Easy'],
  ['Fibonacci Number', 'Recursion', 'Easy'], ['Generate Parentheses', 'Recursion', 'Medium'],
  ['Maximum Depth of Binary Tree', 'Trees', 'Easy'], ['Validate Binary Search Tree', 'Trees', 'Medium'], ['Binary Tree Level Order Traversal', 'Trees', 'Medium'],
  ['Number of Islands', 'Graphs', 'Medium'], ['Clone Graph', 'Graphs', 'Medium'], ['Course Schedule', 'Graphs', 'Medium'],
  ['Climbing Stairs', 'Dynamic Programming', 'Easy'], ['Coin Change', 'Dynamic Programming', 'Medium'], ['Longest Common Subsequence', 'Dynamic Programming', 'Medium'],
]

async function seed() {
  await connectDB(process.env.MONGO_URI)

  await Role.deleteMany({})
  await Role.insertMany(ROLES)

  await Topic.deleteMany({})
  await Topic.insertMany(TOPICS)

  await DSAProblem.deleteMany({})
  await DSAProblem.insertMany(DSA_PROBLEMS.map(([title, topic, difficulty]) => ({ title, topic, difficulty })))

  console.log(`[seed] ${ROLES.length} roles, ${TOPICS.length} topics, ${DSA_PROBLEMS.length} DSA problems inserted.`)
  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('[seed] failed:', err)
  process.exit(1)
})
