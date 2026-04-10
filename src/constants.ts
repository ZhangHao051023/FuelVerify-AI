import { Zone } from './types';

export const FUEL_PRICES: Record<Zone, Record<'RON95' | 'RON95_Market' | 'RON97' | 'Diesel' | 'RON95_SubsidyLimit', number>> = {
  'West Malaysia': {
    RON95: 2.05,
    RON95_Market: 3.19,
    RON97: 3.19,
    Diesel: 3.35,
    RON95_SubsidyLimit: 200,
  },
  'East Malaysia': {
    RON95: 2.05,
    RON95_Market: 3.19,
    RON97: 3.19,
    Diesel: 2.15,
    RON95_SubsidyLimit: 200,
  },
};
