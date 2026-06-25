import { Router } from 'express';

import { prisma } from '../lib/prisma.js';
import { getProviderSuggestions, serializeSuggestion } from '../lib/provider-matching.js';
import { notifyProviderOfLead } from '../services/whatsapp/index.js';

export const leadsRouter = Router();

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : undefined;
}

function toLeadPayload(body) {
  return {
    fullName: cleanString(body.fullName),
    phoneNumber: cleanString(body.phoneNumber),
    email: cleanString(body.email),
    serviceType: cleanString(body.serviceType),
    requestText: cleanString(body.requestText),
    city: cleanString(body.city),
    notes: cleanString(body.notes),
    source: cleanString(body.source),
  };
}

function toLeadUpdatePayload(body) {
  return Object.fromEntries(
    Object.entries({
      fullName: cleanString(body.fullName),
      phoneNumber: cleanString(body.phoneNumber),
      email: cleanString(body.email),
      serviceType: cleanString(body.serviceType),
      requestText: cleanString(body.requestText),
      city: cleanString(body.city),
      notes: cleanString(body.notes),
    }).filter(([, value]) => value !== undefined),
  );
}

function messageFromError(error) {
  return error instanceof Error ? error.message : String(error);
}

function isNotFoundError(error) {
  return error?.code === 'P2025';
}

function dispatchLeadNotification(provider, lead, assignment) {
  setImmediate(async () => {
    const notificationAttemptedAt = new Date();

    try {
      const result = await notifyProviderOfLead(provider, lead);

      await prisma.leadAssignment.update({
        where: { id: assignment.id },
        data: {
          notificationAttemptedAt,
          notificationError: result.error,
          notificationStatus: result.status,
          notifiedAt: result.status === 'SENT' ? new Date() : null,
        },
      });
    } catch (error) {
      console.error(`[whatsapp] Failed to notify provider ${provider.id} for lead ${lead.id}:`, error);
      await prisma.leadAssignment.update({
        where: { id: assignment.id },
        data: {
          notificationAttemptedAt,
          notificationError: messageFromError(error),
          notificationStatus: 'FAILED',
          notifiedAt: null,
        },
      });
    }
  });
}

async function getLeadWithRelations(id) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      assignedProvider: true,
      assignments: true,
    },
  });
}

leadsRouter.get('/', async (_req, res, next) => {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        assignedProvider: true,
        assignments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ leads });
  } catch (error) {
    next(error);
  }
});

leadsRouter.post('/webhook-call', async (req, res, next) => {
  try {
    const phoneNumber = cleanString(req.body.phoneNumber);

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required.' });
    }

    const lead = await prisma.lead.create({
      data: {
        fullName: 'Unknown caller',
        phoneNumber,
        source: 'phone-call',
        status: 'NEW',
      },
      include: {
        assignedProvider: true,
        assignments: true,
      },
    });

    return res.status(201).json({ lead });
  } catch (error) {
    return next(error);
  }
});

leadsRouter.get('/:id/suggestions', async (req, res, next) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    const suggestions = await getProviderSuggestions(lead);
    return res.json({
      lead,
      providerSuggestions: suggestions.map(serializeSuggestion),
    });
  } catch (error) {
    return next(error);
  }
});

leadsRouter.patch('/:id/assign', async (req, res, next) => {
  try {
    const providerId = cleanString(req.body.providerId);

    if (!providerId) {
      return res.status(400).json({ error: 'providerId is required.' });
    }

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    if (!provider.isActive) {
      return res.status(409).json({ error: 'Provider is inactive.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingLead = await tx.lead.findUnique({
        where: { id: req.params.id },
      });

      if (!existingLead) {
        return null;
      }

      await tx.leadAssignment.updateMany({
        where: {
          leadId: existingLead.id,
          providerId: { not: provider.id },
          status: 'ASSIGNED',
        },
        data: {
          status: 'EXPIRED',
        },
      });

      const assignment = await tx.leadAssignment.upsert({
        where: {
          leadId_providerId: {
            leadId: existingLead.id,
            providerId: provider.id,
          },
        },
        create: {
          leadId: existingLead.id,
          providerId: provider.id,
          status: 'ASSIGNED',
          notificationStatus: 'PENDING',
          notificationError: null,
          notificationAttemptedAt: null,
          notifiedAt: null,
        },
        update: {
          status: 'ASSIGNED',
          notificationStatus: 'PENDING',
          notificationError: null,
          notificationAttemptedAt: null,
          notifiedAt: null,
        },
      });

      const lead = await tx.lead.update({
        where: { id: existingLead.id },
        data: {
          assignedProviderId: provider.id,
          status: 'ASSIGNED',
        },
        include: {
          assignedProvider: true,
          assignments: true,
        },
      });

      return { assignment, lead };
    });

    if (!result) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    dispatchLeadNotification(provider, result.lead, result.assignment);

    return res.json({
      assignment: result.assignment,
      lead: result.lead,
      provider,
    });
  } catch (error) {
    return next(error);
  }
});

leadsRouter.post('/:id/retry', async (req, res, next) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        assignedProvider: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found.' });
    }

    if (!lead.assignedProviderId || !lead.assignedProvider) {
      return res.status(409).json({ error: 'Lead has no assigned provider.' });
    }

    const assignment = await prisma.leadAssignment.findUnique({
      where: {
        leadId_providerId: {
          leadId: lead.id,
          providerId: lead.assignedProviderId,
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    if (!['FAILED', 'SKIPPED'].includes(assignment.notificationStatus)) {
      return res.status(409).json({
        error: 'Retry is only available for FAILED or SKIPPED notifications.',
      });
    }

    const resetAssignment = await prisma.leadAssignment.update({
      where: { id: assignment.id },
      data: {
        notificationStatus: 'PENDING',
        notificationError: null,
        notificationAttemptedAt: null,
        notifiedAt: null,
      },
    });

    dispatchLeadNotification(lead.assignedProvider, lead, resetAssignment);

    const updatedLead = await getLeadWithRelations(lead.id);

    return res.json({
      assignment: resetAssignment,
      lead: updatedLead,
      provider: lead.assignedProvider,
    });
  } catch (error) {
    return next(error);
  }
});

leadsRouter.patch('/:id/close', async (req, res, next) => {
  try {
    const resolutionStatus = cleanString(req.body.resolutionStatus);

    if (!resolutionStatus) {
      return res.status(400).json({ error: 'resolutionStatus is required.' });
    }

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        resolutionStatus,
        status: 'CLOSED',
      },
      include: {
        assignedProvider: true,
        assignments: true,
      },
    });

    return res.json({ lead });
  } catch (error) {
    if (isNotFoundError(error)) {
      return res.status(404).json({ error: 'Lead not found.' });
    }
    return next(error);
  }
});

leadsRouter.patch('/:id', async (req, res, next) => {
  try {
    const payload = toLeadUpdatePayload(req.body);

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'No supported lead fields provided.' });
    }

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: payload,
      include: {
        assignedProvider: true,
        assignments: true,
      },
    });

    return res.json({ lead });
  } catch (error) {
    if (isNotFoundError(error)) {
      return res.status(404).json({ error: 'Lead not found.' });
    }
    return next(error);
  }
});

leadsRouter.post('/', async (req, res, next) => {
  try {
    const payload = toLeadPayload(req.body);

    if (!payload.fullName || !payload.phoneNumber || !payload.serviceType) {
      return res.status(400).json({
        error: 'Lead fullName, phoneNumber, and serviceType are required.',
      });
    }

    const suggestions = await getProviderSuggestions(payload);
    const provider = suggestions[0]?.provider;

    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          ...payload,
          status: provider ? 'ASSIGNED' : 'UNASSIGNED',
          assignedProviderId: provider?.id,
        },
      });

      const assignment = provider
        ? await tx.leadAssignment.create({
            data: {
              leadId: lead.id,
              providerId: provider.id,
            },
          })
        : undefined;

      return { assignment, lead };
    });

    if (provider && result.assignment) {
      dispatchLeadNotification(provider, result.lead, result.assignment);
    }

    return res.status(201).json({
      ...result,
      provider,
      providerSuggestions: suggestions.map(serializeSuggestion),
    });
  } catch (error) {
    return next(error);
  }
});
