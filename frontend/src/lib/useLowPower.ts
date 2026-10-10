export function useLowPower(): boolean {
  if (typeof navigator === 'undefined') return false;
  const device = navigator as Navigator & { connection?: { saveData?: boolean } };
  return device.hardwareConcurrency <= 4 || device.connection?.saveData === true;
}
