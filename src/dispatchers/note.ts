import { createNote, getNote, listNotes, searchNotes } from "../services/note/index.js";
import { ValidationError } from "../lib/errors.js";

export async function dispatch(action: string, payload: any) {
  switch (action) {
    case "note.create": {
      if (!payload.content || typeof payload.content !== "string") {
        throw new ValidationError("content is required and must be a string");
      }
      if (payload.content.trim().length === 0) {
        throw new ValidationError("content must not be empty");
      }
      return createNote(payload.content);
    }
    case "note.get": {
      if (!payload.id || typeof payload.id !== "string") {
        throw new ValidationError("id is required and must be a string");
      }
      return getNote(payload.id);
    }
    case "note.list":
      return listNotes(payload ?? {});
    case "note.search": {
      if (!payload.query || typeof payload.query !== "string") {
        throw new ValidationError("query is required and must be a string");
      }
      return searchNotes(payload.query, payload.limit);
    }
    default:
      return null;
  }
}
