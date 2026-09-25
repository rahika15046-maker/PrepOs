import { S, R, topic } from './helpers.js'

const STAGE = 'Data Structures & Algorithms'

const RES = [
  R('NeetCode roadmap & video solutions', 'video', 'neetcode roadmap'),
  R('Striver A2Z DSA sheet', 'practice', 'striver a2z dsa sheet'),
]

const base = (o) =>
  topic({
    stage: STAGE,
    track: 'dsa',
    difficulty: 'intermediate',
    importance: 9,
    resources: RES,
    ...o,
  })

/* Sequential chain — each topic builds on the previous one. */
export const DSA_TOPICS = [
  base({
    key: 'dsa-foundations',
    title: 'DSA Foundations: Complexity & Problem Solving',
    difficulty: 'beginner',
    catalogTopic: 'Math',
    description: 'How to analyse an algorithm and how to attack an unseen problem systematically.',
    outcomes: ['Compute time/space complexity of loops and recursion', 'Follow a repeatable problem-solving framework'],
    subtopicDetails: [
      S('Time & Space Complexity', 3, 'Big-O reasoning.', ['Big-O, Omega, Theta', 'Analysing loops', 'Amortised analysis', 'Space complexity & call stack', 'Best/average/worst case']),
      S('Problem-Solving Framework', 2, 'A process for unseen problems.', ['Clarify & restate', 'Brute force first', 'Optimise with patterns', 'Dry-run with examples', 'Edge cases']),
      S('Math & Number Basics', 3, 'Math tricks that recur in interviews.', ['GCD/LCM', 'Prime sieve', 'Modular arithmetic', 'Fast exponentiation', 'Number-system conversion']),
    ],
  }),
  base({
    key: 'dsa-arrays-strings',
    title: 'Arrays, Strings & Core Patterns',
    prerequisites: ['dsa-foundations'],
    catalogTopic: 'Arrays',
    description: 'The most-tested data structures and the two-pointer / sliding-window / prefix-sum family of patterns.',
    outcomes: ['Solve array and string problems in O(n) using patterns', 'Recognise which pattern a problem needs'],
    subtopicDetails: [
      S('Array Fundamentals & In-place Tricks', 3, 'Traversal, reversal and rotation.', ['Traversal & indexing', 'In-place reversal', 'Rotation', 'Kadane\'s algorithm', 'Dutch national flag']),
      S('Two Pointers', 3, 'Converging or trailing indices.', ['Opposite-end pointers', 'Fast/slow pointers', 'Pair sum in sorted array', 'Removing duplicates', 'Partitioning']),
      S('Sliding Window', 3.5, 'Maintaining a moving range.', ['Fixed-size window', 'Variable-size window', 'Longest substring problems', 'Window with hashmap', 'Monotonic deque window']),
      S('Prefix Sums & Difference Arrays', 2.5, 'Precomputation for range queries.', ['1-D prefix sum', 'Subarray sum = K', '2-D prefix sum', 'Difference array', 'Prefix XOR']),
      S('String Manipulation', 3, 'Text-processing patterns.', ['Palindromes', 'Anagrams', 'Expand around centre', 'String building', 'KMP & Rabin-Karp overview']),
    ],
  }),
  base({
    key: 'dsa-hashing',
    title: 'Hashing: Maps & Sets',
    prerequisites: ['dsa-arrays-strings'],
    catalogTopic: 'Hashing',
    description: 'Constant-time lookups that turn brute-force solutions into linear ones.',
    subtopicDetails: [
      S('Hash Map & Hash Set Internals', 2, 'How hashing works.', ['Hash functions', 'Collisions & chaining/open addressing', 'Load factor & resizing', 'HashMap vs TreeMap']),
      S('Frequency Counting', 3, 'Counting to solve.', ['Character frequency', 'Group anagrams', 'Top-K frequent', 'Majority element']),
      S('Hashing Patterns', 3.5, 'Complement lookups and seen-sets.', ['Two Sum family', 'Longest consecutive sequence', 'Subarray with given sum', 'Duplicate detection', 'Design HashMap']),
    ],
  }),
  base({
    key: 'dsa-linked-lists',
    title: 'Linked Lists',
    prerequisites: ['dsa-arrays-strings'],
    catalogTopic: 'Linked Lists',
    description: 'Pointer manipulation — a favourite for testing careful thinking.',
    subtopicDetails: [
      S('Singly & Doubly Linked Lists', 2.5, 'Structure and core operations.', ['Insert / delete at positions', 'Dummy head technique', 'Doubly-linked list', 'Circular list']),
      S('Reversal & Merging', 3, 'Classic pointer rewiring.', ['Iterative reversal', 'Recursive reversal', 'Reverse in groups', 'Merge two sorted lists', 'Merge K lists']),
      S('Fast & Slow Pointers', 3, 'Floyd\'s technique.', ['Cycle detection', 'Cycle start', 'Middle node', 'Nth from end', 'Palindrome list']),
      S('LRU Cache & Design Problems', 2.5, 'Combining lists with hash maps.', ['LRU cache', 'LFU cache overview', 'Copy list with random pointer']),
    ],
  }),
  base({
    key: 'dsa-stack-queue',
    title: 'Stacks & Queues',
    prerequisites: ['dsa-linked-lists'],
    catalogTopic: 'Stack',
    description: 'LIFO/FIFO structures and the monotonic-stack pattern.',
    subtopicDetails: [
      S('Stack Basics & Parentheses', 2.5, 'Using a stack to track nesting.', ['Stack via array/list', 'Valid parentheses', 'Min stack', 'Expression evaluation', 'Postfix/prefix conversion']),
      S('Monotonic Stack', 3.5, 'Next-greater and span problems.', ['Next greater element', 'Daily temperatures', 'Largest rectangle in histogram', 'Stock span']),
      S('Queues & Deques', 3, 'FIFO processing and sliding extremes.', ['Circular queue', 'Queue via two stacks', 'Deque', 'Sliding window maximum', 'BFS preview']),
    ],
  }),
  base({
    key: 'dsa-searching-sorting',
    title: 'Binary Search & Sorting',
    prerequisites: ['dsa-arrays-strings'],
    catalogTopic: 'Binary Search',
    description: 'Divide-and-conquer on sorted data and the sorting algorithms behind it.',
    subtopicDetails: [
      S('Sorting Algorithms', 4, 'Know the trade-offs.', ['Bubble, selection, insertion', 'Merge sort', 'Quick sort & partitioning', 'Counting/radix sort', 'Stability & in-place', 'Custom comparators']),
      S('Binary Search Fundamentals', 2.5, 'Lower/upper bound without off-by-one errors.', ['Classic binary search', 'First/last occurrence', 'Search insert position', 'Rotated sorted array']),
      S('Binary Search on Answer', 3.5, 'Searching a monotonic condition.', ['Koko eating bananas', 'Capacity to ship packages', 'Aggressive cows', 'Median of two sorted arrays', 'Square root / peak element']),
    ],
  }),
  base({
    key: 'dsa-recursion-backtracking',
    title: 'Recursion & Backtracking',
    prerequisites: ['dsa-stack-queue'],
    catalogTopic: 'Backtracking',
    description: 'Thinking recursively and exploring choice trees.',
    subtopicDetails: [
      S('Recursion Fundamentals', 3, 'Base case, recurrence and the call stack.', ['Base & recursive case', 'Call stack visualisation', 'Tail recursion', 'Recurrence relations', 'Memoisation preview']),
      S('Subsets, Permutations & Combinations', 4, 'Enumerating choices.', ['Subsets', 'Permutations', 'Combination sum', 'Handling duplicates', 'Letter combinations']),
      S('Constraint Backtracking', 3.5, 'Pruning the search space.', ['N-Queens', 'Sudoku solver', 'Word search', 'Palindrome partitioning', 'Pruning strategies']),
    ],
  }),
  base({
    key: 'dsa-trees',
    title: 'Trees, BST & Tries',
    prerequisites: ['dsa-recursion-backtracking'],
    catalogTopic: 'Trees',
    description: 'Hierarchical data, traversals and recursion on trees.',
    subtopicDetails: [
      S('Binary Tree Traversals', 3.5, 'Visiting every node.', ['Preorder / inorder / postorder', 'Level-order (BFS)', 'Iterative traversals', 'Morris traversal overview', 'Views (left/right/top/bottom)']),
      S('Tree Recursion Patterns', 4.5, 'Height, diameter, paths and LCA.', ['Height & diameter', 'Balanced tree check', 'Path sum family', 'Lowest common ancestor', 'Construct tree from traversals', 'Serialise / deserialise']),
      S('Binary Search Trees', 3, 'Ordered trees.', ['BST property', 'Insert / delete / search', 'Validate BST', 'Kth smallest', 'Balanced trees (AVL, Red-Black) overview']),
      S('Tries', 2.5, 'Prefix trees.', ['Trie insert/search', 'Prefix matching', 'Word search II', 'Autocomplete']),
    ],
  }),
  base({
    key: 'dsa-heaps',
    title: 'Heaps, Priority Queues & Intervals',
    prerequisites: ['dsa-trees'],
    catalogTopic: 'Heap',
    description: 'Efficiently tracking minimum/maximum and scheduling problems.',
    subtopicDetails: [
      S('Heap Fundamentals', 2.5, 'Complete binary tree in an array.', ['Min-heap / max-heap', 'Heapify', 'Heap sort', 'Priority queue API']),
      S('Top-K & Streaming Problems', 3.5, 'Bounded heaps.', ['Kth largest element', 'Top K frequent', 'K closest points', 'Merge K sorted', 'Median of a stream']),
      S('Intervals & Scheduling', 3, 'Sorting by endpoints.', ['Merge intervals', 'Insert interval', 'Non-overlapping intervals', 'Meeting rooms', 'Task scheduler']),
    ],
  }),
  base({
    key: 'dsa-graphs',
    title: 'Graphs',
    prerequisites: ['dsa-heaps'],
    catalogTopic: 'Graphs',
    difficulty: 'advanced',
    description: 'Modelling relationships: traversal, connectivity, ordering and shortest paths.',
    subtopicDetails: [
      S('Graph Representation & Traversal', 4, 'Adjacency lists and BFS/DFS.', ['Adjacency list vs matrix', 'BFS', 'DFS', 'Connected components', 'Grid problems as graphs', 'Cycle detection']),
      S('Topological Sort & DAGs', 3, 'Ordering with dependencies.', ['Kahn\'s algorithm', 'DFS topological sort', 'Course schedule', 'Alien dictionary']),
      S('Union-Find (DSU)', 2.5, 'Dynamic connectivity.', ['Union by rank', 'Path compression', 'Redundant connection', 'Number of provinces']),
      S('Shortest Paths', 4, 'Weighted graphs.', ['Dijkstra', 'Bellman-Ford', 'Floyd-Warshall', '0-1 BFS', 'Network delay time', 'Cheapest flights within K stops']),
      S('Minimum Spanning Trees', 2, 'Connecting everything cheaply.', ['Kruskal', 'Prim', 'Cut property']),
    ],
  }),
  base({
    key: 'dsa-dp',
    title: 'Dynamic Programming',
    prerequisites: ['dsa-recursion-backtracking'],
    catalogTopic: 'Dynamic Programming',
    difficulty: 'advanced',
    description: 'Breaking problems into overlapping subproblems — the most feared, most learnable topic.',
    subtopicDetails: [
      S('DP Foundations', 3, 'Memoisation vs tabulation.', ['Overlapping subproblems', 'Optimal substructure', 'Top-down memoisation', 'Bottom-up tabulation', 'Space optimisation']),
      S('1-D DP', 3.5, 'Linear state.', ['Climbing stairs / Fibonacci', 'House robber', 'Coin change', 'Decode ways', 'Word break', 'Longest increasing subsequence']),
      S('2-D & Grid DP', 3.5, 'Two-parameter state.', ['Unique paths', 'Minimum path sum', 'Maximal square', 'Dungeon game']),
      S('Knapsack Family', 3.5, 'Choose or skip.', ['0/1 knapsack', 'Subset sum / partition', 'Target sum', 'Unbounded knapsack', 'Coin change II']),
      S('String DP', 3.5, 'Two-string alignment.', ['Longest common subsequence', 'Edit distance', 'Palindromic subsequence', 'Distinct subsequences']),
      S('Advanced DP Patterns', 3, 'Trickier state design.', ['Stock buy/sell with cooldown', 'Bitmask DP', 'DP on trees', 'Interval DP']),
    ],
  }),
  base({
    key: 'dsa-greedy-bits',
    title: 'Greedy, Bit Manipulation & Math',
    prerequisites: ['dsa-heaps'],
    catalogTopic: 'Greedy',
    description: 'Local-optimal decisions and low-level tricks that show up as bonus questions.',
    subtopicDetails: [
      S('Greedy Algorithms', 4, 'When taking the best now is provably best.', ['Exchange argument', 'Jump game', 'Gas station', 'Partition labels', 'Activity selection', 'Huffman coding overview']),
      S('Bit Manipulation', 3, 'Working with bits.', ['AND / OR / XOR / shifts', 'Single number problems', 'Count set bits', 'Power of two', 'Bitmask subsets']),
    ],
  }),
]
