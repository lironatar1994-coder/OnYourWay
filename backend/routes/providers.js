import { Router } from 'express';

import { prisma } from '../lib/prisma.js';

export const providersRouter = Router();

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : undefined;
}

function toProviderPayload(body) {
  return {
    name: cleanString(body.name),
    phoneNumber: cleanString(body.phoneNumber),
    whatsappJid: cleanString(body.whatsappJid),
    category: cleanString(body.category),
    serviceText: cleanString(body.serviceText),
    serviceArea: cleanString(body.serviceArea),
    priority: Number.isInteger(body.priority) ? body.priority : undefined,
    dailyLeadLimit: Number.isInteger(body.dailyLeadLimit) ? body.dailyLeadLimit : undefined,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
  };
}

providersRouter.get('/', async (_req, res, next) => {
  try {
    const providers = await prisma.provider.findMany({
      orderBy: [{ isActive: 'desc' }, { priority: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({ providers });
  } catch (error) {
    next(error);
  }
});

providersRouter.post('/', async (req, res, next) => {
  try {
    const payload = toProviderPayload(req.body);

    if (!payload.name || !payload.phoneNumber) {
      return res.status(400).json({
        error: 'Provider name and phoneNumber are required.',
      });
    }

    const provider = await prisma.provider.create({ data: payload });
    return res.status(201).json({ provider });
  } catch (error) {
    return next(error);
  }
});

providersRouter.patch('/:id', async (req, res, next) => {
  try {
    const payload = Object.fromEntries(
      Object.entries(toProviderPayload(req.body)).filter(([, value]) => value !== undefined),
    );

    const provider = await prisma.provider.update({
      where: { id: req.params.id },
      data: payload,
    });

    return res.json({ provider });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    return next(error);
  }
});
