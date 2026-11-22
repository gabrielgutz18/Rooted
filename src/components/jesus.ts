// Jesus, drawn by hand as pixel art: white robe, red mantle over the shoulder, a halo.
// The figure is 20 × 30 art pixels (its middle is column BODY_X), in a 26-wide frame so the
// arm that reaches out to touch the tree fits. He faces you, or turns His head the way He
// walks; the frames face right and are mirrored to face left. Each letter is a colour from
// PAL, '.' is empty.

export const JESUS_W = 26;
export const JESUS_H = 30;
export const BODY_X = 10;

const FIGURE = [
  '.......yyyyyy.......',
  '.....yYY....YYy.....',
  '....yY.oooooo.Yy....',
  '....YoorRHHrhooY....',
  '....ohrRRHHrrhHo....',
  '...ohrRRrHHrrhhHo...',
  '...ohrRrHssHrhhHo...',
  '...ohrRhssssHrhHo...',
  '...ohrhssssssHhHo...',
  '...ohrhsessesHhHo...',
  '...ohrhsessesHhHo...',
  '...ohrhSssssShhHo...',
  '...ohrhshhhhshhHo...',
  '...ohrhhhpphhhhHo...',
  '..ohrHohhhhhhoHhHo..',
  '..ohrHwohhhhowHhHo..',
  '.oomMMMwwoooowwwgoo.',
  'omMoMMMMwwwwwwwgowwo',
  'omMowmMMMnwwwwwgowwo',
  'owwowwmMMMnwwwwgowwo',
  'owwowwwwmMMMnwwgowgo',
  'owgogwwwwwmMMMngowgo',
  'ossogwwwwwwwmMMnosso',
  'oSSogwwwwwwwwmMnoSSo',
  '.ooogwwgwwgwwmMnooo.',
  '..oggwwgwwgwwmMMno..',
  '..oGgwwgwwgwgnMMno..',
  '..oGGggGggGggnnnno..',
  '..ooosfsoooosfsooo..',
  '.....ooo....ooo.....',
];
const IDLE = FIGURE.map((r) => r + '......');

/** A copy of `rows` with `s` written into row `y` from column `x`. */
function patch(rows: string[], edits: [number, number, string][]): string[] {
  const out = [...rows];
  for (const [y, x, s] of edits) out[y] = out[y].slice(0, x) + s + out[y].slice(x + s.length);
  return out;
}

// eyes closed for a moment
const shut = (rows: string[]) =>
  patch(rows, [
    [9, 8, 's'],
    [9, 11, 's'],
    [10, 8, 'p'],
    [10, 11, 'p'],
  ]);
const BLINK = shut(IDLE);

// His left arm (on the right of the picture) reaching out, the palm on the bark
const TOUCH = patch(IDLE, [
  [15, 16, 'Hho.......'],
  [16, 16, 'gooooooo..'],
  [17, 16, 'wwwwwwgsso'],
  [18, 16, 'gwwgggSsso'],
  [19, 16, 'oggggooSSo'],
  [20, 16, 'ooooo..oo.'],
  [21, 16, 'o...'],
  [22, 16, 'o...'],
  [23, 16, 'o...'],
  [24, 16, 'oo..'],
]);

// reaching down to touch a little tree (a seed or a sprout)
const LOW = patch(IDLE, [
  [17, 16, 'owwo......'],
  [18, 16, 'owwwo.....'],
  [19, 16, 'ogwwwo....'],
  [20, 16, 'oogwwwo...'],
  [21, 16, 'o.oggwwo..'],
  [22, 16, 'o..oggsso.'],
  [23, 16, 'o...oSsso.'],
  [24, 16, 'oo...oSSo.'],
  [25, 16, '......oo..'],
]);

/** Where His palm meets the tree in each reaching frame (art pixels from the top-left). */
export const PALM = { touch: { x: 25, y: 18 }, low: { x: 24, y: 23 } };

// walking: the head turned to the right, one foot forward and the other behind the robe,
// the hands swinging a little
const SIDE = patch(IDLE, [
  [3, 0, '....YoorRRrhhooY....'],
  [4, 0, '....ohrRRrrhhHHo....'],
  [5, 0, '...ohrRRrrhhhhHHo...'],
  [6, 0, '...ohrRrhhHssssHo...'],
  [7, 0, '...ohrRhhHsssssHo...'],
  [8, 0, '...ohrhhHssssssHo...'],
  [9, 0, '...ohrhhHsessesHo...'],
  [10, 0, '...ohrhhHsessesHo...'],
  [11, 0, '...ohrhhhSsssSsHo...'],
  [12, 0, '...ohrhhhhshhhsHo...'],
  [13, 0, '...ohrhhhhhhpphHo...'],
  [14, 0, '..ohrHhhohhhhhhoHo..'],
  [15, 0, '..ohrHhwwohhhhowHo..'],
  [16, 0, '.oomMMMwwwoooowwgoo.'],
]);
const WALK_A = patch(SIDE, [
  [21, 0, 'osso'],
  [22, 0, 'oSSo'],
  [23, 0, 'oooo'],
  [28, 0, '..oosfsooooooooooo..'],
  [29, 0, '....ooo.............'],
]);
const WALK_B = patch(SIDE, [
  [21, 16, 'osso'],
  [22, 16, 'oSSo'],
  [23, 16, 'oooo'],
  [28, 0, '..oooooooooosfsooo..'],
  [29, 0, '...........ooo......'],
]);

// the right hand raised in blessing, in front of the shoulder
const BLESS = patch(IDLE, [
  [8, 15, '.ooo.'],
  [9, 15, 'ossso'],
  [10, 15, 'ossso'],
  [11, 15, 'osssS'],
  [11, 19, 'o'],
  [12, 15, 'oSsSo'],
  [13, 15, 'oowoo'],
  [14, 15, 'owwgo'],
  [15, 15, 'owwgo'],
  [16, 15, 'owggo'],
  [17, 15, 'ogggo'],
  [18, 15, 'gooo.'],
  [19, 16, 'o...'],
  [20, 16, 'o...'],
  [21, 16, 'o...'],
  [22, 16, 'o...'],
  [23, 16, 'o...'],
  [24, 16, 'oo..'],
]);

export const FRAMES = {
  idle: IDLE,
  blink: BLINK,
  touch: TOUCH,
  touchBlink: shut(TOUCH),
  low: LOW,
  lowBlink: shut(LOW),
  walkA: WALK_A,
  walkB: WALK_B,
  bless: BLESS,
};
export type Frame = keyof typeof FRAMES;

const PAL: Record<string, string> = {
  o: '#120a18', // outline
  y: '#fff4c0', // halo
  Y: '#ffd866',
  H: '#4a2618', // hair, dark → light
  h: '#6e3a22',
  r: '#8f5432',
  R: '#b07548',
  s: '#f7c6ad', // skin
  S: '#e0a08a',
  p: '#b0645a', // mouth
  e: '#2a1424', // eyes
  w: '#eeedf6', // robe
  g: '#c9c5de',
  G: '#9590b4',
  m: '#e8524a', // mantle
  M: '#c02c34',
  n: '#7e1a2a',
  f: '#6a3c24', // sandal straps
};

/** Draws one frame on a JESUS_W × JESUS_H canvas. */
export function drawJesus(c: HTMLCanvasElement, frame: Frame) {
  const ctx = c.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, JESUS_W, JESUS_H);
  FRAMES[frame].forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const col = PAL[ch];
      if (!col) return;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
}
