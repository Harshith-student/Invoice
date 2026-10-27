import { z } from 'zod';
import Client from '../models/Client.js';
import { createError } from '../middleware/errorHandler.js';

// ─── Zod schemas ─────────────────────────────────────────────────────────────

export const clientSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Invalid email').toLowerCase(),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  gstin: z.string().optional().default(''),
});

// ─── Controllers ─────────────────────────────────────────────────────────────

export const getClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, clients });
  } catch (err) {
    next(err);
  }
};

export const getClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, userId: req.user._id });
    if (!client) throw createError('Client not found', 404);
    res.json({ success: true, client });
  } catch (err) {
    next(err);
  }
};

export const createClient = async (req, res, next) => {
  try {
    const client = await Client.create({ userId: req.user._id, ...req.body });
    res.status(201).json({ success: true, client });
  } catch (err) {
    next(err);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!client) throw createError('Client not found', 404);
    res.json({ success: true, client });
  } catch (err) {
    next(err);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!client) throw createError('Client not found', 404);
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) {
    next(err);
  }
};
