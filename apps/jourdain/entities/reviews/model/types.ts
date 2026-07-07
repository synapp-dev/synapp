export type Review = {
  id: string;
  /** Monday of the reviewed week, YYYY-MM-DD. */
  weekStart: string;
  wins: string | null;
  challenges: string | null;
  focus: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertReviewInput = {
  weekStart: string;
  wins?: string | null;
  challenges?: string | null;
  focus?: string | null;
};
