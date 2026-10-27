import { createContext } from "react";

/** What a Field tells the control inside it, so the label, hint and error are wired up for you. */
export type FieldState = { id: string; describedBy?: string; invalid: boolean };

export const FieldContext = createContext<FieldState | null>(null);
