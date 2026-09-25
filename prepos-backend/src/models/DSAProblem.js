import mongoose from 'mongoose'

const dsaProblemSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },

      topic: {
        type: String,
        enum: [
          'Arrays',
          'Strings',
          'Linked Lists',
          'Stack',
          'Queue',
          'Recursion',
          'Trees',
          'Graphs',
          'Dynamic Programming',
          'Greedy',
          'Heap',
          'Binary Search',
          'Bit Manipulation',
          'Hashing',
          'Backtracking',
          'Intervals',
          'Trie',
          'Math',
        ],
        required: true,
      },

      /*
       * Pattern is separate from topic.
       *
       * Example:
       *
       * Topic: Arrays
       * Pattern: Two Pointers
       */
      pattern: {
        type: String,
        trim: true,
      },

      difficulty: {
        type: String,
        enum: [
          'Easy',
          'Medium',
          'Hard',
        ],
        required: true,
      },

      /*
       * LeetCode title slug.
       *
       * Example:
       * two-sum
       */
      leetcodeSlug: {
        type: String,
        trim: true,
      },

      url: {
        type: String,
        trim: true,
      },

      /*
       * Used when constructing the adaptive
       * DSA roadmap.
       */
      importance: {
        type: Number,
        default: 5,
        min: 1,
        max: 10,
      },

      estimatedMinutes: {
        type: Number,
        default: 45,
        min: 5,
      },
    },

    {
      timestamps: true,
    }
  )

dsaProblemSchema.index({
  topic: 1,
  pattern: 1,
  difficulty: 1,
})

dsaProblemSchema.index({
  leetcodeSlug: 1,
})

export default mongoose.model(
  'DSAProblem',
  dsaProblemSchema
)