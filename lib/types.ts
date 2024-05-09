export type Message = {
  readonly sleepGoal: number | null;
  readonly sleep: { minutes: number; endTime: string } | null;
  readonly sleepDebts: string[];
};
