export const getTriggerName = (
  t: (key: string, fallback?: string) => string,
  ruleType: string,
  fallbackName?: string
): string => {
  return t(`trigger.${ruleType}.name`, fallbackName || ruleType);
};

export const getTriggerDescription = (
  t: (key: string, fallback?: string) => string,
  ruleType: string,
  fallbackDesc?: string
): string => {
  return t(`trigger.${ruleType}.desc`, fallbackDesc || '');
};

export const getPlaceholderDescription = (
  t: (key: string, fallback?: string) => string,
  key: string,
  fallbackDesc?: string
): string => {
  const cleanKey = key.replace(/[{}]/g, '');
  return t(`trigger.placeholder.${cleanKey}`, fallbackDesc || key);
};
