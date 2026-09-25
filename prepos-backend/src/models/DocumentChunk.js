import mongoose from 'mongoose'

const documentChunkSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'StudyDocument', required: true },
    index: { type: Number, required: true },
    text: { type: String, required: true },
    // embedding stored as plain array; swap for a vector index (Atlas Search / Pinecone) at scale
    embedding: { type: [Number], default: undefined },
  },
  { timestamps: true }
)

export default mongoose.model('DocumentChunk', documentChunkSchema)
