import { createNote, getNote, listNotes, searchNotes } from "../services/note/index.js";

export async function dispatch(action: string, payload: any) {
  switch (action) {
    case "note.create":
      return createNote(payload.content);
    case "note.get":
      return getNote(payload.id);
    case "note.list":
      return listNotes(payload ?? {});
    case "note.search":
      return searchNotes(payload.query, payload.limit);
    default:
      return null;
  }
}
