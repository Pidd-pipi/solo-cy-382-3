import { Injectable } from '@nestjs/common';

@Injectable()
export class CompanionService {
  score(candidate: { destination: string; budgetMax: number }, target: { destination: string; budgetMax: number }) {
    let score = candidate.destination === target.destination ? 70 : 20;
    score += Math.max(0, 30 - Math.abs(candidate.budgetMax - target.budgetMax) / 100);
    return Math.round(score);
  }
}
