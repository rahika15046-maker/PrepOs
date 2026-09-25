import mongoose from 'mongoose'

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, default: 'general' },
}, { timestamps: true })

export default mongoose.model('Skill', skillSchema)
