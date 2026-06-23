import type { Method, MethodParams } from '@/lib/core/config';

type MethodParamOverride = Partial<
  Pick<
    MethodParams,
    'coffee' | 'water' | 'ratio' | 'grindSize' | 'temp' | 'extractionTime'
  >
>;

const withGramUnit = (value: string | number | undefined): string => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return text.toLowerCase().endsWith('g') ? text : `${text}g`;
};

const getExtractionStage = (method: Method) =>
  method.params.stages.find(stage => stage.pourType === 'extraction');

export const getEspressoExtractionTime = (
  method: Method,
  override?: MethodParamOverride | null
): number | undefined => {
  const extractionStage = getExtractionStage(method);

  return (
    override?.extractionTime ??
    method.params.extractionTime ??
    extractionStage?.duration ??
    extractionStage?.time ??
    (method.params.stages.length === 0 ? 25 : undefined)
  );
};

export const getEspressoLiquidWeight = (
  method: Method,
  override?: MethodParamOverride | null
): string => {
  const extractionStage = getExtractionStage(method);

  return withGramUnit(
    override?.water ??
      method.params.liquidWeight ??
      extractionStage?.water ??
      method.params.water
  );
};

export const getEspressoParamRows = (
  method: Method,
  override?: MethodParamOverride | null
): { label: string; value: string }[] => {
  const extractionTime = getEspressoExtractionTime(method, override);

  return [
    { label: '咖啡粉', value: override?.coffee ?? method.params.coffee },
    { label: '研磨度', value: override?.grindSize ?? method.params.grindSize },
    {
      label: '萃取时长',
      value: extractionTime === undefined ? '-' : `${extractionTime}s`,
    },
    { label: '液重', value: getEspressoLiquidWeight(method, override) },
  ];
};

export const getEspressoParamItems = (
  method: Method,
  override?: MethodParamOverride | null
): string[] =>
  getEspressoParamRows(method, override).map(
    ({ label, value }) => `${label} ${value || '-'}`
  );
