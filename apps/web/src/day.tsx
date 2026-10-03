import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { buildDay } from "../../api/src/engine.ts";
import type { DayPayload, Meter, Policy } from "./model";

type DayState = {
  day: DayPayload | null;
  error: string | null;
  offline: boolean;
  meter: Meter;
  setMeter: (meter: Meter) => void;
  policy: Policy;
  setPolicy: (policy: Policy) => void;
  step: number;
  setStep: (step: number) => void;
  meterBlind: boolean;
  setMeterBlind: (value: boolean) => void;
  linkLoss: boolean;
  setLinkLoss: (value: boolean) => void;
  priorityRule: boolean;
  setPriorityRule: (value: boolean) => void;
};

const DayContext = createContext<DayState | null>(null);

export function DayProvider({ children }: { children: ReactNode }) {
  const [day, setDay] = useState<DayPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [meter, setMeter] = useState<Meter>("one");
  const [policy, setPolicy] = useState<Policy>("plan");
  const [step, setStep] = useState(40);
  const [meterBlind, setMeterBlind] = useState(false);
  const [linkLoss, setLinkLoss] = useState(false);
  const [priorityRule, setPriorityRule] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ meter, powerKw: "3" });
    if (meterBlind) params.set("meterBlind", "1");
    if (linkLoss) params.set("linkLoss", "c22");
    const controller = new AbortController();
    fetch(`/api/day?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`API ${response.status}`);
        return response.json() as Promise<DayPayload>;
      })
      .then((payload) => {
        setDay(payload);
        setError(null);
        setOffline(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        try {
          setDay(buildDay(meter, 3, linkLoss ? "c22" : "", meterBlind) as DayPayload);
          setError(null);
          setOffline(true);
        } catch {
          setError("The demo day could not be built.");
        }
      });
    return () => controller.abort();
  }, [meter, meterBlind, linkLoss]);

  return (
    <DayContext.Provider value={{ day, error, offline, meter, setMeter, policy, setPolicy, step, setStep, meterBlind, setMeterBlind, linkLoss, setLinkLoss, priorityRule, setPriorityRule }}>
      {children}
    </DayContext.Provider>
  );
}

export function useDay(): DayState {
  const value = useContext(DayContext);
  if (!value) throw new Error("useDay outside DayProvider");
  return value;
}
