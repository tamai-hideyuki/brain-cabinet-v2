import { computeDrift, listDriftEvents, acknowledgeDrift } from "../services/drift/index.js";

export async function dispatch(action: string, payload: any) {
  switch (action) {
    case "drift.compute":
      return computeDrift(payload?.windowDays);
    case "drift.list":
      return listDriftEvents(payload?.limit);
    case "drift.acknowledge":
      return acknowledgeDrift(payload.id);
    default:
      return null;
  }
}
