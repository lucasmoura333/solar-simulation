import type { Block, SolarModule, Water } from "../types";

/**
 * Portas (ports) do domínio solar.
 *
 * Estas interfaces são o ponto de injeção para o projeto maior: o núcleo de
 * cálculo (placement/production/sombreamento) só conhece estas portas — nunca
 * bibliotecas concretas. Implementações concretas vivem em `core/adapters`.
 */

/** Local geográfico do estudo (usado por quem calcula posição/irradiância). */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  /** Deslocamento do fuso em horas em relação à UTC (Brasil: −3). */
  timezoneHours: number;
}

export interface SolarPosition {
  /** Azimute navegacional em graus (0=N, 90=E, 180=S, 270=O). */
  azimuthDeg: number;
  /** Elevação acima do horizonte em graus (negativa = abaixo). */
  elevationDeg: number;
}

/** Fonte de posição solar (porta). Algoritmos possíveis: NOAA, SPA/NREL, etc. */
export interface SolarPositionProvider {
  readonly name: string;
  readonly location: GeoLocation;
  /**
   * Posição do sol para uma hora local fracionária (0–24) na data do estudo.
   * A data em UTC pode ser sobrescrita (ex.: outro dia para simular o ano).
   */
  getPosition(input: { hourFraction: number; dateUtc?: string }): SolarPosition;
}

/** Fonte de irradiância do dia de estudo (porta). Ex.: TMY, perfil mock, API. */
export interface IrradianceProvider {
  readonly name: string;
  /** Perfil horário em W/m² (24 amostras, uma por hora do dia). */
  hourlyW_m2(): number[];
}

/** Resultado da análise de sombreamento (fator por módulo e por hora). */
export interface ShadingAnalysisResult {
  moduleOrder: string[];
  triPerModule: number[];
  /** Fator de luz por módulo por hora (24 × M, flat [hora * M + módulo]). */
  factorByModuleHour: Float32Array;
  radianceHourly: number[];
  totalTriangles: number;
}

/** Motor de sombreamento (porta). Ex.: raycast CPU, simshady/GPU, serviço. */
export interface ShadingProvider {
  readonly name: string;
  analyze(input: {
    blocks: Block[];
    waters: Water[];
    modules: SolarModule[];
    solarPosition: SolarPositionProvider;
    irradiance: IrradianceProvider;
  }): Promise<ShadingAnalysisResult>;
}

/** Composição das portas usada pelo aplicativo. */
export interface Providers {
  solarPosition: SolarPositionProvider;
  irradiance: IrradianceProvider;
  shading: ShadingProvider;
}
