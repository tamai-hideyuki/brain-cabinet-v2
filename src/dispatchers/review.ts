import { getNextReviews, submitReview } from "../services/review/index.js";
import { ValidationError } from "../lib/errors.js";

export async function dispatch(action: string, payload: any) {
  switch (action) {
    case "review.next":
      return getNextReviews(payload?.limit);
    case "review.submit": {
      if (!payload.noteId || typeof payload.noteId !== "string") {
        throw new ValidationError("noteId is required and must be a string");
      }
      if (payload.quality === undefined || typeof payload.quality !== "number") {
        throw new ValidationError("quality is required and must be a number");
      }
      if (payload.quality < 0 || payload.quality > 5) {
        throw new ValidationError("quality must be between 0 and 5");
      }
      return submitReview(payload);
    }
    default:
      return null;
  }
}
