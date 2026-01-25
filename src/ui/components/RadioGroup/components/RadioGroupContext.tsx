import { createContext } from "react";

export interface RadioGroupContextValue {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | undefined>(
  undefined,
);
