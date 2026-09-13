export interface CreateTripInput {
  ownerId?: number;
  destination?: string;
  departDate?: string;
  days?: number;
  budgetMin?: number;
  budgetMax?: number;
  transport?: string;
  companionCount?: number;
  genderPreference?: string;
}

export interface MatchQuery {
  destination?: string;
  dateFrom?: string;
  dateTo?: string;
  budgetMin?: string;
  budgetMax?: string;
}

export interface MatchedTrip {
  id: number;
  destination: string;
  departDate: string;
  days: number;
  budgetMin?: number;
  budgetMax?: number;
  transport: string;
  companionCount: number;
  genderPreference?: string;
  score: number;
}
