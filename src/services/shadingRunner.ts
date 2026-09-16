export type { ShadingAnalysisResult } from "../core/providers";

/**
 * Histórico: este módulo rodava `@openpv/simshady` 0.2.2 na GPU. O pacote foi
 * descontinuado aqui por produzir NaN em séries temporais (T>1): ele concatena
 * as direções de todas as entradas para o raytrace, mas o somatório JS lê
 * `radiation[t][i]` com i além do vetor de cada entrada → NaN. A implementação
 * ativa é a CPU determinística em `utils/solarShading.ts` (mesmo formato).
 */
