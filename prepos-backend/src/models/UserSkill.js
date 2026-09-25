import mongoose from 'mongoose'

const userSkillSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skillName: { type: String, required: true },
    level: { type: String, enum: ['Never Learned', 'Beginner', 'Intermediate', 'Strong'], default: 'Never Learned' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
)

userSkillSchema.index({ user: 1, skillName: 1 }, { unique: true })

export default mongoose.model('UserSkill', userSkillSchema)
