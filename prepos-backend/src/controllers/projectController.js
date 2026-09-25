import Project from '../models/Project.js'
import UserSkill from '../models/UserSkill.js'
import catchAsync from '../utils/catchAsync.js'
import AppError from '../utils/AppError.js'
import { recordActivityAndXp } from '../services/activityHelper.js'

export const listProjects = catchAsync(async (req, res) => {
  const projects = await Project.find({ user: req.user._id }).sort('-createdAt')
  res.status(200).json({ success: true, projects })
})

export const createProject = catchAsync(async (req, res) => {
  const project = await Project.create({ ...req.body, user: req.user._id })
  await recordActivityAndXp(req.user._id, 'project_milestone', { projectId: project._id, event: 'created' })
  res.status(201).json({ success: true, project })
})

export const updateProject = catchAsync(async (req, res, next) => {
  const project = await Project.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true, runValidators: true })
  if (!project) return next(new AppError('Project not found.', 404))
  if (req.body.status === 'Completed') await recordActivityAndXp(req.user._id, 'project_milestone', { projectId: project._id, event: 'completed' })
  res.status(200).json({ success: true, project })
})

export const deleteProject = catchAsync(async (req, res, next) => {
  const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.user._id })
  if (!project) return next(new AppError('Project not found.', 404))
  res.status(200).json({ success: true, message: 'Project removed.' })
})

/** Very simple recommendation: suggest a project once a skill crosses ~60% progress. */
export const recommendProjects = catchAsync(async (req, res) => {
  const skills = await UserSkill.find({ user: req.user._id })
  const ready = skills.filter((s) => s.progress >= 60).map((s) => s.skillName)
  const suggestions = ready.map((skillName) => ({
    skillName,
    suggestion: `You're solid on ${skillName} — this is a good time to start a project that leans on it.`,
  }))
  res.status(200).json({ success: true, suggestions })
})
