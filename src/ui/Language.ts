export type Language = 'da' | 'en';
const KEY = 'kart-royale-language';
let language: Language = 'da';
try { if (localStorage.getItem(KEY) === 'en') language = 'en'; } catch { /* optional storage */ }

const danish: Record<string, string> = {
  'Choose track': 'Vælg bane', 'Moon Tower': 'Månetårnet', 'Moon Tower · Test track': 'Månetårnet · Testbane',
  'Language': 'Sprog', 'Mute music': 'Sluk musik', 'Unmute music': 'Tænd musik',
  'Controls': 'Styring', 'Press Enter to Start': 'Tryk Enter for at starte', 'Tap to Start': 'Tryk for at starte',
  'Choose your racer': 'Vælg din kører', 'Start race': 'Start løbet', 'You': 'Dig',
  'Speed': 'Fart', 'Accel': 'Acceleration', 'Handling': 'Styring', 'Weight': 'Vægt',
  'Race suspended': 'Løbet er sat på pause', 'Paused': 'Pause', 'Running order': 'Stillingen',
  'Resume': 'Fortsæt', 'Restart race': 'Genstart løbet', 'Quit to title': 'Til startskærmen',
  'Race complete': 'Løbet er slut', 'Race again': 'Kør igen', 'Back to title': 'Til startskærmen',
  'Winner': 'Vinder', 'Best lap': 'Bedste omgang', 'Lap': 'Omgang', 'Time': 'Tid', 'Best': 'Bedste', 'Total': 'Samlet',
  'Grid': 'Startfelt', 'Solo': 'Alene', 'GO!': 'KØR!', 'Perfect!': 'Perfekt!', 'Hit': 'Ramt', 'Took the lead': 'Du fører',
  'Pirat': 'Pirat', 'Bedstemor': 'Bedstemor', 'Mumie': 'Mumie',
  'Done': 'Færdig', 'Steer': 'Styr', 'Slide': 'Drift', 'Fire': 'Affyr',
  'Hand': 'Hånd', 'Right': 'Højre', 'Left': 'Venstre', 'Throttle': 'Gas', 'Auto': 'Auto', 'Manual': 'Manuel',
  'Steering help': 'Styrehjælp', 'Off': 'Fra', 'Light': 'Let', 'Strong': 'Kraftig',
  'Easy drift': 'Drifthjælp', 'Half': 'Halv', 'Full': 'Fuld', 'Vibration': 'Vibration', 'On': 'Til',
  'Tilt range': 'Vippevinkel', 'Recentre': 'Centrér', 'waiting for the sensor…': 'venter på sensoren…',
  'motion access was refused': 'adgang til bevægelsessensoren blev afvist',
  'Floating stick': 'Flydende joystick', 'Fixed stick': 'Fast joystick', 'Tilt to steer': 'Vip for at styre', 'Steer buttons': 'Styreknapper',
  'Appears wherever your thumb lands. Never look for it.': 'Vises, hvor din tommelfinger lander.',
  'Always in the same place. Muscle memory, no drift.': 'Altid samme sted. Find det uden at kigge.',
  'Roll the phone. Both thumbs free for the buttons.': 'Vip telefonen. Begge tommelfingre er fri.',
  'Two big pads. Nothing to hold steady.': 'To store knapper. Intet at holde fast.',
  'Drive the control below this line · saved on this device': 'Prøv styringen under denne linje · gemmes på enheden',
  'Drive the control below this line · vibration unavailable in this browser': 'Prøv styringen herunder · browseren understøtter ikke vibration',
  'Rotate your device': 'Drej din enhed', 'Kart Royale plays in landscape.': 'Kart Royale spilles i liggende format.',
  'BRAKE': 'BREMSE', 'GAS': 'GAS', 'DRIFT': 'DRIFT',
  'steer': 'styr', 'accelerate': 'gas', 'drift': 'drift', 'item': 'genstand', 'pause': 'pause',
  'STEER': 'STYR', 'TILT': 'VIP', 'LET GO': 'SLIP',
  'Turbo Can': 'Turbodåse', 'Triple Turbo': 'Tredobbelt turbo', 'Glass Float': 'Glaskugle',
  'Homing Float': 'Målsøgende kugle', 'Lemon': 'Citron', 'Golden Hour': 'Gylden time',
  'Squall': 'Stormbyge', 'Harbour Mine': 'Havnemine',
  'starting up': 'starter', 'starting renderer': 'starter grafikken',
  'reading controls': 'gør styringen klar', 'raising the sun': 'placerer solen',
  'mixing materials': 'blander materialer', 'laying the circuit': 'bygger banen',
  'dressing the bay': 'gør bugten klar', 'rolling out the grid': 'gør kørerne klar',
  'loading item boxes': 'indlæser genstande', 'lighting the effects': 'gør effekter klar',
  'mounting the camera': 'placerer kameraet', 'drawing the hud': 'gør instrumenterne klar',
  'tuning the engines': 'justerer motorerne', 'balancing the frame': 'gør billedet klar',
  'compiling shaders': 'klargør grafikken', 'ready': 'klar', 'loading': 'indlæser',
};
const english: Record<string, string> = { Pirat: 'Pirate', Bedstemor: 'Grandma', Mumie: 'Mummy' };

export const getLanguage = () => language;
export function t(text: string): string {
  if (language === 'en') return english[text] ?? text;
  if (danish[text] !== undefined) return danish[text];
  return text.replace(/^Lap (\d+)/, 'Omgang $1')
    .replace(/^Finished (\d+)(?:st|nd|rd|th|\.)$/, 'Slut: $1. plads')
    .replace(/^(\d+)(?:st|nd|rd|th|\.) place$/, '$1. plads')
    .replace(/° of roll$/, '° hældning');
}

/** Retain source text for immediate, reversible language changes on existing labels. */
export function languageText(element: Element, text: string) {
  if (text in danish || text in english || /^(Lap \d|Finished \d|\d+(?:st|nd|rd|th|\.) place)|° of roll$/.test(text)) {
    element.setAttribute('data-i18n', text);
  } else element.removeAttribute('data-i18n');
  element.textContent = t(text);
}
export function translateLabels(root: ParentNode = document) {
  root.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.getAttribute('data-i18n')!);
  });
}

document.documentElement.lang = language;
export function setLanguage(next: Language) {
  language = next;
  try { localStorage.setItem(KEY, next); } catch { /* session choice still works */ }
  document.documentElement.lang = next;
  translateLabels();
  window.dispatchEvent(new Event('kart-language-change'));
}
