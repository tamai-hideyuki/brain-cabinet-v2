import { computeDrift, listDriftEvents, acknowledgeDrift } from "../services/drift/index.js";
import { ValidationError } from "../lib/errors.js";

export async function dispatch(action: string, payload: any) {
  switch (action) {
    case "drift.compute":
      return computeDrift(payload?.windowDays);
    case "drift.list":
      return listDriftEvents(payload?.limit);
    case "drift.acknowledge": {
      if (!payload.id || typeof payload.id !== "string") {
        throw new ValidationError("id is required and must be a string");
      }
      return acknowledgeDrift(payload.id);
    }
    default:
      return null;
  }
}
