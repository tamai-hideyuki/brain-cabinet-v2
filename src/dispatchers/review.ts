import { getNextReviews, submitReview } from "../services/review/index.js";

export async function dispatch(action: string, payload: any) {
  switch (action) {
    case "review.next":
      return getNextReviews(payload?.limit);
    case "review.submit":
      return submitReview(payload);
    default:
      return null;
  }
}
