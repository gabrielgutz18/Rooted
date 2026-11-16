// The update notices shown in Menu → Updates, newest first. To announce something new,
// add an entry at the top with a new `id`: everyone who hasn't opened it yet sees "New".
// Screenshots live in src/assets/updates/ (most come from the e2e tests' screenshots).

import type { Lang } from './i18n';
import lampNewFlame from '../assets/updates/lamp-new-flame.png';
import lampStoked from '../assets/updates/lamp-stoked.png';
import leavesFalling from '../assets/updates/leaves-falling.png';
import friendLamp from '../assets/updates/friend-lamp.png';
import mapleCanada from '../assets/updates/maple-canada.png';
import flame001 from '../assets/updates/flame-001.png';
import flame010 from '../assets/updates/flame-010.png';
import flame020 from '../assets/updates/flame-020.png';
import flame030 from '../assets/updates/flame-030.png';
import flame050 from '../assets/updates/flame-050.png';
import flame100 from '../assets/updates/flame-100.png';
import flame200 from '../assets/updates/flame-200.png';
import lampPostMine from '../assets/updates/lamp-post-mine.png';
import lampPostFriend from '../assets/updates/lamp-post-friend.png';
import lampPostNight from '../assets/updates/lamp-post-night.png';
import streakCardHidden from '../assets/updates/streak-card-hidden.png';

type Text = Record<Lang, string>;

export interface UpdatePicture {
  src: string;
  alt: Text;
  /** A short label under a small picture in a row (e.g. "10 days"). */
  label?: Text;
}

export interface UpdateSection {
  heading: Text;
  text: Text;
  pictures?: UpdatePicture[];
  /** Small pictures side by side instead of one big one each. */
  row?: boolean;
}

export interface Update {
  id: string;
  date: string; // YYYY-MM-DD
  title: Text;
  intro: Text;
  sections: UpdateSection[];
}

const days = (n: number): Text => ({ en: `${n} ${n === 1 ? 'day' : 'days'}`, tl: `${n} araw` });

export const UPDATES: Update[] = [
  {
    id: '2026-11-16-lamp-posts',
    date: '2026-11-16',
    title: { en: 'Lamp posts', tl: 'Mga poste ng ilawan' },
    intro: {
      en: 'Your lamp now hangs on a little wooden post beside your tree — and so does every friend’s.',
      tl: 'Nakasabit na ngayon ang iyong ilawan sa isang maliit na posteng kahoy sa tabi ng iyong puno — gayundin ang sa bawat kaibigan.',
    },
    sections: [
      {
        heading: { en: 'A lamp post by your tree', tl: 'Poste ng ilawan sa tabi ng iyong puno' },
        text: {
          en: 'The lantern hangs on a chain from a wooden post in the grass, burning in your streak’s colour. When a note makes your streak longer, it flares up there too.',
          tl: 'Nakasabit sa kadena ang ilawan mula sa isang posteng kahoy sa damuhan, nagliliyab sa kulay ng iyong sunod-sunod na araw. Kapag humaba ito dahil sa isang tala, lumalagablab din ito roon.',
        },
        pictures: [{ src: lampPostMine, alt: { en: 'An oak tree with the streak card in the corner and a lamp post with an orange flame beside it', tl: 'Isang punong roble na may kard ng streak sa sulok at poste ng ilawan na may kahel na apoy sa tabi nito' } }],
      },
      {
        heading: { en: 'Your friends’ lamp posts', tl: 'Ang mga poste ng ilawan ng iyong mga kaibigan' },
        text: {
          en: 'Visit a friend’s tree and their lantern hangs on their own post. No names or numbers — just the colour of their fire, so you can see how they’re keeping on.',
          tl: 'Bisitahin ang puno ng kaibigan at nakasabit ang kanyang ilawan sa sarili niyang poste. Walang pangalan o numero — kulay lang ng kanyang apoy, para makita mo kung paano siya nagpapatuloy.',
        },
        pictures: [{ src: lampPostFriend, alt: { en: 'A friend’s cherry tree with a lamp post and a blue Sapphire flame', tl: 'Ang punong sakura ng kaibigan na may poste ng ilawan at asul na apoy na Sapiro' } }],
      },
      {
        heading: { en: 'Swing it, and see it at night', tl: 'Iugoy ito, at tingnan sa gabi' },
        text: {
          en: 'Press a lamp post and the lantern swings on its chain while the fire leaps up. After dark the wood fades into the night and the lantern lights the ground around it.',
          tl: 'Pindutin ang poste at uugoy ang ilawan sa kadena habang lumalaki ang apoy. Pagdilim, naglalaho ang kahoy sa gabi at iniilawan ng ilawan ang lupa sa paligid nito.',
        },
        pictures: [{ src: lampPostNight, alt: { en: 'The lamp post at night, its blue flame lighting the ground', tl: 'Ang poste ng ilawan sa gabi, iniilawan ng asul na apoy ang lupa' } }],
      },
      {
        heading: { en: 'Hide the streak card', tl: 'Itago ang kard ng streak' },
        text: {
          en: 'Prefer a cleaner view? Press × on the streak card. A small chip with your days stays in its place — press it to bring the card back. Your lamp post keeps burning either way.',
          tl: 'Gusto mo ng mas malinis na tanaw? Pindutin ang × sa kard ng streak. May maliit na tatak ng iyong mga araw na papalit dito — pindutin ito para ibalik ang kard. Patuloy na nagliliyab ang iyong poste ng ilawan alinman dito.',
        },
        pictures: [{ src: streakCardHidden, alt: { en: 'The tree with the streak card hidden: only a small “9 days” chip and the lamp post', tl: 'Ang puno na nakatago ang kard ng streak: isang maliit na tatak na “9 araw” at ang poste ng ilawan na lang' } }],
      },
    ],
  },
  {
    id: '2026-11-16-streak-lamp',
    date: '2026-11-16',
    title: { en: 'The streak lamp', tl: 'Ang ilawan ng sunod-sunod na araw' },
    intro: {
      en: 'Your tree has a new companion: a little brass lamp that keeps count of the days you write in a row.',
      tl: 'May bagong kasama ang iyong puno: isang maliit na ilawang tanso na nagbibilang ng sunod-sunod na araw ng iyong pagsusulat.',
    },
    sections: [
      {
        heading: { en: 'A lamp for your daily streak', tl: 'Ilawan para sa sunod-sunod mong araw' },
        text: {
          en: 'Write a note each day and the lamp in the corner of your tree stays lit. Today only breaks the streak once the day is over, so there is always time to write. When the streak grows, the fire flares up.',
          tl: 'Sumulat ng tala araw-araw at mananatiling may sindi ang ilawan sa sulok ng iyong puno. Mapuputol lang ang sunod-sunod na araw kapag tapos na ang araw, kaya may oras ka pang sumulat. Kapag humaba ito, lumalagablab ang apoy.',
        },
        pictures: [{ src: lampNewFlame, alt: { en: 'The lamp flaring up with the message “New flame: Gold!”', tl: 'Lumalagablab ang ilawan at may mensaheng “Bagong apoy: Ginto!”' } }],
      },
      {
        heading: { en: 'Seven flames to reach', tl: 'Pitong apoy na maaabot' },
        text: {
          en: 'The flame changes colour as you keep going: Ember from the first day, then Gold at 10 days, Emerald at 20, Sky at 30, Sapphire at 50, Violet at 100 and Glory at 200.',
          tl: 'Nagbabago ang kulay ng apoy habang nagpapatuloy ka: Baga sa unang araw, Ginto sa 10 araw, Esmeralda sa 20, Langit sa 30, Sapiro sa 50, Lila sa 100 at Kaluwalhatian sa 200.',
        },
        row: true,
        pictures: [
          [flame001, 1, 'Ember', 'Baga'],
          [flame010, 10, 'Gold', 'Ginto'],
          [flame020, 20, 'Emerald', 'Esmeralda'],
          [flame030, 30, 'Sky', 'Langit'],
          [flame050, 50, 'Sapphire', 'Sapiro'],
          [flame100, 100, 'Violet', 'Lila'],
          [flame200, 200, 'Glory', 'Kaluwalhatian'],
        ].map(([src, n, en, tl]) => ({
          src: src as string,
          label: days(n as number),
          alt: { en: `The ${en} flame, at ${n} ${n === 1 ? 'day' : 'days'}`, tl: `Ang apoy na ${tl}, sa ${n} araw` },
        })),
      },
      {
        heading: { en: 'Tap the lamp', tl: 'Pindutin ang ilawan' },
        text: {
          en: 'Press the lamp and it swings on its ring, the fire leaps up and light shines out. Press it a few times quickly and it blazes even brighter.',
          tl: 'Pindutin ang ilawan at uugoy ito, lalaki ang apoy at sisinag ang liwanag. Pindutin nang ilang beses nang mabilis at lalo pa itong magliliyab.',
        },
        pictures: [{ src: lampStoked, alt: { en: 'The lamp swinging, with a burst of golden light around it', tl: 'Umuugoy ang ilawan at may sumisinag na gintong liwanag' } }],
      },
      {
        heading: { en: 'A tree left alone loses its leaves', tl: 'Nalalagas ang dahon ng punong pinabayaan' },
        text: {
          en: 'If no note is written for a few days, the leaves start to fall, and after two weeks the branches are bare. Don’t worry — your growth is never lost, and one note brings the leaves back.',
          tl: 'Kapag walang tala nang ilang araw, magsisimulang malagas ang mga dahon, at pagkalipas ng dalawang linggo ay wala nang dahon ang mga sanga. Huwag mag-alala — hindi nawawala ang iyong paglago, at isang tala lang ay babalik ang mga dahon.',
        },
        pictures: [{ src: leavesFalling, alt: { en: 'A tree losing its leaves after 8 days without a note', tl: 'Isang punong nalalagasan ng dahon pagkatapos ng 8 araw na walang tala' } }],
      },
      {
        heading: { en: 'Your friends’ lamps', tl: 'Ang mga ilawan ng iyong mga kaibigan' },
        text: {
          en: 'Visit a friend’s tree and you’ll see their lamp too, so you can cheer each other on.',
          tl: 'Bisitahin ang puno ng kaibigan at makikita mo rin ang kanyang ilawan, para makapagpalakasan kayo ng loob.',
        },
        pictures: [{ src: friendLamp, alt: { en: 'A friend’s cherry tree with a blue Sapphire flame at 52 days', tl: 'Ang punong sakura ng kaibigan na may asul na apoy na Sapiro sa 52 araw' } }],
      },
    ],
  },
  {
    id: '2026-11-16-usernames-lands',
    date: '2026-11-16',
    title: { en: 'Usernames and native lands', tl: 'Mga username at katutubong lupain' },
    intro: {
      en: 'Signing in is simpler, and every tree now grows in the land it comes from.',
      tl: 'Mas madali na ang pag-sign in, at bawat puno ay lumalago na sa lupaing pinagmulan nito.',
    },
    sections: [
      {
        heading: { en: 'Sign in with a username', tl: 'Mag-sign in gamit ang username' },
        text: {
          en: 'Accounts now use a username instead of an email address. If you joined with an email, you’ll be asked to choose a username once — your password stays the same.',
          tl: 'Username na ang gamit ng mga account sa halip na email. Kung email ang ginamit mo sa pagsali, hihilingin sa iyong pumili ng username nang isang beses — hindi magbabago ang iyong password.',
        },
      },
      {
        heading: { en: 'Each tree in its own land', tl: 'Bawat puno sa sariling lupain' },
        text: {
          en: 'The oak grows in the English countryside, the sakura in Japan, the maple below Canada’s mountains, the pine in the Philippines, and more. Choose a tree from the menu to visit its land.',
          tl: 'Sa kanayunan ng Inglatera tumutubo ang roble, sa Hapon ang sakura, sa paanan ng mga bundok ng Canada ang maple, sa Pilipinas ang pino, at iba pa. Pumili ng puno sa menu para bisitahin ang lupain nito.',
        },
        pictures: [{ src: mapleCanada, alt: { en: 'A maple tree in front of snowy Canadian mountains', tl: 'Isang punong maple sa harap ng maniyebeng bundok ng Canada' } }],
      },
    ],
  },
  {
    id: '2026-11-15-private-notes',
    date: '2026-11-15',
    title: { en: 'Private notes, Tagalog and offline', tl: 'Pribadong tala, Tagalog at offline' },
    intro: {
      en: 'Your notes are safer, Rooted speaks Tagalog, and it works even without a connection.',
      tl: 'Mas ligtas na ang iyong mga tala, marunong nang mag-Tagalog ang Rooted, at gumagana ito kahit walang koneksyon.',
    },
    sections: [
      {
        heading: { en: 'Notes only you can read', tl: 'Mga talang ikaw lang ang makakabasa' },
        text: {
          en: 'Notes are locked on your device before they are saved, so not even the admin can read them. Keep your recovery key somewhere safe (Menu → Recovery key).',
          tl: 'Nila-lock ang mga tala sa iyong device bago i-save, kaya kahit ang admin ay hindi makakabasa ng mga ito. Itago ang iyong recovery key sa ligtas na lugar (Menu → Recovery key).',
        },
      },
      {
        heading: { en: 'Tagalog, install and offline', tl: 'Tagalog, pag-install at offline' },
        text: {
          en: 'Switch the language at the bottom of the menu. Install Rooted on your phone or computer, and notes written offline are saved as soon as you’re back online.',
          tl: 'Palitan ang wika sa ibaba ng menu. I-install ang Rooted sa iyong telepono o computer, at mase-save ang mga talang isinulat offline pagbalik mo online.',
        },
      },
    ],
  },
];

export const LATEST_UPDATE = UPDATES[0].id;

const SEEN_KEY = 'rooted.updatesSeen';

/** Whether the newest update hasn't been opened in this browser yet. */
export function hasUnseenUpdate(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== LATEST_UPDATE;
  } catch {
    return false; // storage blocked: don't nag
  }
}

export function markUpdatesSeen() {
  try {
    localStorage.setItem(SEEN_KEY, LATEST_UPDATE);
  } catch {
    // private mode: it shows as new again next time
  }
}
