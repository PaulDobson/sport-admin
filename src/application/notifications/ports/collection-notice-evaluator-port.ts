export interface CollectionNoticeEvaluatorPort {
  evaluate(input: {
    referenceDate: string;
    renewalWindowDays: number;
  }): Promise<number>;
}
