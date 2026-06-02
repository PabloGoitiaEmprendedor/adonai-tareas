export type ElectronUnsubscribe = () => void;

export function subscribeElectronEvent<TArgs extends unknown[]>(
  register: ((callback: (...args: TArgs) => void) => ElectronUnsubscribe | void) | undefined,
  callback: (...args: TArgs) => void
): ElectronUnsubscribe {
  if (!register) {
    return () => {};
  }

  const unsubscribe = register(callback);
  return typeof unsubscribe === "function" ? unsubscribe : () => {};
}
