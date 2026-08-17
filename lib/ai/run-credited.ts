import { creditService } from '@/lib/credits';
import { getAiCreditCost, type AiCreditOperation } from '@/lib/credits/config';
import type { Reservation } from '@/lib/credits/credit-service';
import type { ProviderJsonResult } from '@/lib/ai/complete-json';

type CreditedSuccess<T> = {
  replayed: false;
  parsed: T;
  usage: ProviderJsonResult;
  reservation: Reservation;
};

type CreditedReplay = {
  replayed: true;
  parsed: null;
  usage: null;
  reservation: Reservation;
};

export async function runCreditedJson<T>(params: {
  userId: string;
  dossierId: string;
  operation: AiCreditOperation;
  idempotencyKey: string;
  execute: () => Promise<{ parsed: T; usage: ProviderJsonResult }>;
}): Promise<CreditedSuccess<T> | CreditedReplay> {
  const reservation = await creditService.reserve({
    userId: params.userId,
    operation: params.operation,
    provider: process.env.MOCK_AI === 'true' ? 'mock' : 'openai',
    model: process.env.MOCK_AI === 'true' ? 'mock-ai' : process.env.OPENAI_MODEL || 'gpt-4o-mini',
    idempotencyKey: params.idempotencyKey,
    dossierId: params.dossierId,
    cost: getAiCreditCost(params.operation),
  });

  if (reservation.alreadySettled) {
    return { replayed: true, parsed: null, usage: null, reservation };
  }

  try {
    const executed = await params.execute();
    await creditService.settle({
      usageId: reservation.usageId,
      inputTokens: executed.usage.inputTokens,
      outputTokens: executed.usage.outputTokens,
      estimatedCost: executed.usage.estimatedCost,
      model: executed.usage.model,
    });
    return { replayed: false, ...executed, reservation };
  } catch (error) {
    await creditService.rollback({
      usageId: reservation.usageId,
      reason: 'provider_error',
    });
    throw error;
  }
}
