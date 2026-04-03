import { fetchLatestFuelPrices as fetchLatestFuelPricesFromWorker } from './cloudflareWorkerApi';
import { Zone } from '../types';

export interface FuelPrices {
  RON95: number;
  RON95_Market: number;
  RON97: number;
  Diesel: number;
  RON95_SubsidyLimit: number;
}

export type RegionalFuelPrices = Record<Zone, FuelPrices>;

export async function fetchLatestFuelPrices(): Promise<RegionalFuelPrices | null> {
  return fetchLatestFuelPricesFromWorker();
}

