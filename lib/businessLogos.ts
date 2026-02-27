import { ImageSourcePropType } from 'react-native';

const logos: Record<string, ImageSourcePropType> = {
  // Original 7
  origo: require('@/assets/images/logos/origo.png'),
  shift: require('@/assets/images/logos/shift.png'),
  manuc: require('@/assets/images/logos/manuc.png'),
  artist: require('@/assets/images/logos/artist.png'),
  floraria: require('@/assets/images/logos/floraria.png'),
  zen: require('@/assets/images/logos/zen.png'),
  paine: require('@/assets/images/logos/paine.png'),
  // Universitate / Old Town
  verona: require('@/assets/images/logos/verona.png'),
  hmanuc: require('@/assets/images/logos/hmanuc.png'),
  nomad: require('@/assets/images/logos/nomad.png'),
  energiea: require('@/assets/images/logos/energiea.png'),
  tucano: require('@/assets/images/logos/tucano.png'),
  dianei: require('@/assets/images/logos/dianei.png'),
  fixcycle: require('@/assets/images/logos/fixcycle.png'),
  carturesti: require('@/assets/images/logos/carturesti.png'),
  lente: require('@/assets/images/logos/lente.png'),
  nailslash: require('@/assets/images/logos/nailslash.png'),
  // Sector 4
  copac: require('@/assets/images/logos/copac.png'),
  dulceplai: require('@/assets/images/logos/dulceplai.png'),
  fitzone: require('@/assets/images/logos/fitzone.png'),
  roma: require('@/assets/images/logos/roma.png'),
  belladonna: require('@/assets/images/logos/belladonna.png'),
  drunklord: require('@/assets/images/logos/drunklord.png'),
  farmanat: require('@/assets/images/logos/farmanat.png'),
  sushim: require('@/assets/images/logos/sushim.png'),
  opticalook: require('@/assets/images/logos/opticalook.png'),
  thaimass: require('@/assets/images/logos/thaimass.png'),
  // Mixed / Bulevardul Unirii
  steam: require('@/assets/images/logos/steam.png'),
  cinecity: require('@/assets/images/logos/cinecity.png'),
  crossbrc: require('@/assets/images/logos/crossbrc.png'),
  amorino: require('@/assets/images/logos/amorino.png'),
  barber13: require('@/assets/images/logos/barber13.png'),
  decathlon: require('@/assets/images/logos/decathlon.png'),
  buongiorno: require('@/assets/images/logos/buongiorno.png'),
  sensiblu: require('@/assets/images/logos/sensiblu.png'),
  escape4: require('@/assets/images/logos/escape4.png'),
  bobcoffee: require('@/assets/images/logos/bobcoffee.png'),
};

export function getBusinessLogo(key?: string | null): ImageSourcePropType | null {
  if (!key) return null;
  return logos[key] ?? null;
}

export default logos;
