// The update notices shown in Menu → Updates, newest first. To announce something new,
// add an entry at the top with a new `id`: it opens by itself, once, the next time each member
// opens the app or signs in (src/App.tsx), and shows as "New" in the menu until it's been read.
// Screenshots live in src/assets/updates/ (most come from the e2e tests' screenshots).

import type { Lang } from './i18n';
import lampNewFlame from '../assets/updates/lamp-new-flame.png';
import lampStoked from '../assets/updates/lamp-stoked.png';
import leavesFalling from '../assets/updates/leaves-falling.png';
import friendLamp from '../assets/updates/friend-lamp.png';
import landOak from '../assets/updates/land-oak.png';
import landSakura from '../assets/updates/land-sakura.png';
import landMaple from '../assets/updates/land-maple.png';
import landApple from '../assets/updates/land-apple.png';
import landBirch from '../assets/updates/land-birch.png';
import landWillow from '../assets/updates/land-willow.png';
import landPine from '../assets/updates/land-pine.png';
import landJacaranda from '../assets/updates/land-jacaranda.png';
import landEucalyptus from '../assets/updates/land-eucalyptus.png';
import landSocotra from '../assets/updates/land-socotra.png';
import landPoinciana from '../assets/updates/land-poinciana.png';
import landGoldenshower from '../assets/updates/land-goldenshower.png';
import landMagnolia from '../assets/updates/land-magnolia.png';
import landSpruce from '../assets/updates/land-spruce.png';
import landSilktree from '../assets/updates/land-silktree.png';
import landBaobab from '../assets/updates/land-baobab.png';
import landGinkgo from '../assets/updates/land-ginkgo.png';
import landTrumpet from '../assets/updates/land-trumpet.png';
import landMonkeypuzzle from '../assets/updates/land-monkeypuzzle.png';
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
import profileIcons from '../assets/updates/profile-icons.png';
import pinnedNote from '../assets/updates/pinned-note.png';
import jesusVisit from '../assets/updates/jesus-visit.png';
import jesusTouchClose from '../assets/updates/jesus-touch-close.png';
import jesusSeedClose from '../assets/updates/jesus-seed-close.png';
import jesusPalmClose from '../assets/updates/jesus-palm-close.png';
import jesusNote3x from '../assets/updates/jesus-note-3x.png';
import landCoconut from '../assets/updates/land-coconut.png';
import noteFolders from '../assets/updates/note-folders.png';
import folderOpen from '../assets/updates/folder-open.png';
import folderIcons from '../assets/updates/folder-icons.png';

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
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export const UPDATES: Update[] = [
  {
    id: '2026-11-24-note-folders',
    date: '2026-11-24',
    title: { en: 'Folders for your notes', tl: 'Mga folder para sa iyong mga tala' },
    intro: {
      en: 'My notes is now a little desktop. Make pixel folders, give each one a name, a color and a little icon, and keep related notes together: your evangelism notes in “Evangelism”, your prayers in “Prayer”.',
      tl: 'Isa nang maliit na desktop ang Aking mga tala. Gumawa ng mga pixel na folder, bigyan ang bawat isa ng pangalan, kulay at maliit na icon, at pagsama-samahin ang magkakaugnay na tala: ang mga tala mo sa ebanghelismo sa “Ebanghelismo”, ang iyong mga panalangin sa “Panalangin”.',
    },
    sections: [
      {
        heading: { en: 'Hold a note, drag it in', tl: 'Pindutin nang matagal ang tala, i-drag ito papasok' },
        text: {
          en: 'Press New folder above your notes and type a name. Then press and hold a note until it lifts, and drag it onto a folder, with a mouse or a finger. A folder with notes in it has paper sticking out, and its number says how many.',
          tl: 'Pindutin ang Bagong folder sa itaas ng iyong mga tala at mag-type ng pangalan. Saka pindutin nang matagal ang isang tala hanggang umangat ito, at i-drag ito sa isang folder, gamit ang mouse o daliri. May papel na nakausli sa folder na may laman, at sinasabi ng numero nito kung ilan.',
        },
        pictures: [
          {
            src: noteFolders,
            alt: {
              en: 'My notes with a blue Evangelism folder with a fish on it holding 2 notes, a lavender Prayer folder with a dove holding 1, and a New folder tile',
              tl: 'Ang Aking mga tala na may asul na folder na Evangelism na may isda at 2 tala, lavender na folder na Prayer na may kalapati at 1 tala, at ang Bagong folder',
            },
          },
        ],
      },
      {
        heading: { en: '18 colors and 19 icons', tl: '18 kulay at 19 na icon' },
        text: {
          en: 'Give each folder its own look. Press New folder, or open a folder you already have and press Edit in its title bar. Under the name, pick a little picture for its front (a cross, a Bible, a dove, a fish, a church, the world, music, a flame and more), then a color. Every color shows your icon, so you can see how it will look before you save.',
          tl: 'Bigyan ang bawat folder ng sariling itsura. Pindutin ang Bagong folder, o buksan ang folder na mayroon ka na at pindutin ang I-edit sa title bar nito. Sa ilalim ng pangalan, pumili ng maliit na larawan para sa harap nito (krus, Bibliya, kalapati, isda, simbahan, mundo, musika, apoy at marami pa), saka ng kulay. Makikita ang icon mo sa bawat kulay, kaya alam mo na ang itsura nito bago mo i-save.',
        },
        pictures: [
          {
            src: folderIcons,
            alt: {
              en: 'Editing a folder: a row of 20 icon choices with the globe picked, and under it 18 colored folders to choose from, each showing the globe',
              tl: 'Pag-edit ng folder: 20 pagpipiliang icon na napili ang mundo, at sa ilalim nito ang 18 makukulay na folder na pagpipilian, bawat isa ay may mundo',
            },
          },
        ],
      },
      {
        heading: { en: 'Open a folder like a window', tl: 'Buksan ang folder na parang window' },
        text: {
          en: 'Tap a folder to see its notes in a window of its color. Edit changes its name, color or icon. To take a note out, drag it to Back to desktop, or press Move on any note instead of dragging. Deleting a folder never deletes notes: they go back to the desktop. Search still looks through every note and shows which folder each one is in.',
          tl: 'Pindutin ang isang folder para makita ang mga tala nito sa isang window na kakulay nito. Sa I-edit, mapapalitan ang pangalan, kulay o icon nito. Para ilabas ang isang tala, i-drag ito sa Ibalik sa desktop, o pindutin ang Ilipat sa kahit anong tala sa halip na mag-drag. Hindi kailanman nabubura ang mga tala kapag binura ang folder: babalik sila sa desktop. Hinahanap pa rin ng Search ang bawat tala at ipinapakita kung saang folder ito nakalagay.',
        },
        pictures: [
          {
            src: folderOpen,
            alt: {
              en: 'The Evangelism folder open as a blue window with its two notes inside',
              tl: 'Ang folder na Evangelism na bukas bilang asul na window, kasama ang dalawang tala nito',
            },
          },
        ],
      },
      {
        heading: { en: 'Private, like your notes', tl: 'Pribado, gaya ng iyong mga tala' },
        text: {
          en: 'Folder names, and which note is in which folder, are locked on your device before they are saved, so nobody else can read them: not friends, and not the admin. They follow you to every device where you unlock your notes.',
          tl: 'Naka-lock sa iyong device ang mga pangalan ng folder, at kung aling tala ang nasa aling folder, bago ito i-save, kaya walang ibang makakabasa: hindi ang mga kaibigan, at hindi ang admin. Susunod ang mga ito sa bawat device kung saan mo binubuksan ang iyong mga tala.',
        },
      },
    ],
  },
  {
    id: '2026-11-22-jesus-visits',
    date: '2026-11-22',
    title: { en: 'Jesus visits your tree', tl: 'Dinadalaw ni Hesus ang iyong puno' },
    intro: {
      en: 'Every now and then, Jesus comes to visit your tree, and the note you write while He’s there grows your tree 3×. There’s also a new tree: the coconut palm.',
      tl: 'Paminsan-minsan, dumadalaw si Hesus sa iyong puno, at 3× ang ipapalago sa iyong puno ng talang isusulat mo habang narito Siya. May bago ring puno: ang niyog.',
    },
    sections: [
      {
        heading: { en: 'A surprise visit', tl: 'Isang sorpresang pagdalaw' },
        text: {
          en: 'You won’t know when He’s coming: on some days, at a different time each day, Jesus walks up to your tree and stays for a while. A small sign in the top corner tells you He’s there, so nothing covers your tree.',
          tl: 'Hindi mo malalaman kung kailan Siya darating: sa ilang araw, sa ibang oras bawat araw, lalapit si Hesus sa iyong puno at mananatili nang ilang sandali. May maliit na karatula sa itaas na sulok na nagsasabing narito Siya, kaya walang nakatakip sa iyong puno.',
        },
        pictures: [
          {
            src: jesusVisit,
            alt: {
              en: 'Jesus in a white robe and red sash, with His hand on an oak tree at sunset, and “Jesus is visiting · notes grow 3×” in the corner',
              tl: 'Si Hesus na nakaputing damit at pulang banda, nakahawak sa isang punong roble sa paglubog ng araw, at “Narito si Hesus · 3× ang paglago” sa sulok',
            },
          },
        ],
      },
      {
        heading: { en: 'Your next note grows 3×', tl: '3× ang paglago ng susunod mong tala' },
        text: {
          en: 'Write a note while He’s visiting and it gives your tree three times the growth. Today’s note shows it as you write. Jesus blesses that note, then goes on His way. Your note stays locked so only you can read it: only its growth is tripled.',
          tl: 'Sumulat ng tala habang dumadalaw Siya at tatlong beses ang ipapalago nito sa iyong puno. Makikita mo ito sa Tala ngayong araw habang sumusulat ka. Pagpapalain ni Hesus ang talang iyon, saka Siya magpapatuloy sa Kanyang lakad. Nananatiling naka-lock ang iyong tala kaya ikaw lang ang makakabasa: ang paglago lang nito ang tinatriple.',
        },
        pictures: [
          {
            src: jesusNote3x,
            alt: {
              en: 'Today’s note with “Jesus is visiting · 3× growth +37 × 3” among the reasons, for +111 growth',
              tl: 'Ang Tala ngayong araw na may “Narito si Hesus · 3× na paglago +37 × 3” sa mga dahilan, para sa +111 na paglago',
            },
          },
        ],
      },
      {
        heading: { en: 'He walks about and touches your tree', tl: 'Naglalakad Siya at hinahawakan ang iyong puno' },
        text: {
          en: 'While He’s there, Jesus walks around your tree, stops to look at it, and rests His hand on the trunk as light flows into it. He comes even when your tree is just a seed, and kneels down beside it. Tap Him and He waves. He only visits your own tree, not the trees you visit.',
          tl: 'Habang narito Siya, naglalakad si Hesus sa paligid ng iyong puno, humihinto para tingnan ito, at ipinapatong ang Kanyang kamay sa katawan nito habang dumadaloy ang liwanag dito. Dumarating Siya kahit binhi pa lang ang iyong puno, at yumuyuko sa tabi nito. I-tap Siya at kakaway Siya. Sa sarili mong puno lang Siya dumadalaw, hindi sa mga punong binibisita mo.',
        },
        row: true,
        pictures: [
          {
            src: jesusTouchClose,
            label: { en: 'At an oak', tl: 'Sa roble' },
            alt: { en: 'Close up: Jesus with His hand on an oak’s trunk, light flowing in', tl: 'Malapitan: si Hesus na nakahawak sa katawan ng roble, dumadaloy ang liwanag' },
          },
          {
            src: jesusSeedClose,
            label: { en: 'Beside a seed', tl: 'Sa tabi ng binhi' },
            alt: { en: 'Close up: Jesus kneeling down to a seed just planted', tl: 'Malapitan: si Hesus na yumuyuko sa binhing katatanim lang' },
          },
          {
            src: jesusPalmClose,
            label: { en: 'At a coconut palm', tl: 'Sa niyog' },
            alt: { en: 'Close up: Jesus with His hand on a coconut palm on the beach', tl: 'Malapitan: si Hesus na nakahawak sa isang niyog sa tabing-dagat' },
          },
        ],
      },
      {
        heading: { en: 'A new tree: the coconut palm', tl: 'Bagong puno: ang niyog' },
        text: {
          en: 'The coconut palm grows on a tropical beach: its fronds sway over the sand, coconuts hang under its crown, the sea runs out to an island, a bangka rests by the shore and crabs walk past. Choose it from the menu (Choose tree) — your growth stays the same.',
          tl: 'Sa isang tabing-dagat sa tropiko tumutubo ang niyog: umiindayog ang mga palapa nito sa ibabaw ng buhangin, nakabitin ang mga bunga sa ilalim ng korona nito, umaabot ang dagat hanggang sa isang pulo, may bangka sa may pampang at may mga alimangong dumaraan. Piliin ito sa menu (Pumili ng puno) — mananatili ang iyong paglago.',
        },
        pictures: [
          {
            src: landCoconut,
            alt: {
              en: 'A grown coconut palm on a sandy beach at noon, with the sea, an island, a bangka and crabs',
              tl: 'Isang malaking puno ng niyog sa mabuhanging tabing-dagat sa tanghali, may dagat, pulo, bangka at mga alimango',
            },
          },
        ],
      },
    ],
  },
  {
    id: '2026-11-22-icon-fix',
    date: '2026-11-22',
    title: { en: 'Fixed: changing your profile icon', tl: 'Naayos: pagpapalit ng icon ng profile' },
    intro: {
      en: 'Some of you tried to pick a new profile icon and got an error instead. That’s fixed now — sorry for the trouble!',
      tl: 'Sinubukan ng ilan sa inyo na pumili ng bagong icon ng profile pero error ang lumabas. Naayos na iyon ngayon — paumanhin sa abala!',
    },
    sections: [
      {
        heading: { en: 'Pick your icon again', tl: 'Pumili muli ng iyong icon' },
        text: {
          en: 'If it didn’t work for you before, open Menu → My profile and press Change beside Your icon. Any icon on any background colour saves now, and your friends will see it next to your name.',
          tl: 'Kung hindi ito gumana sa iyo dati, buksan ang Menu → Aking profile at pindutin ang Palitan sa tabi ng Iyong icon. Mase-save na ang anumang icon sa anumang kulay sa likod, at makikita ito ng iyong mga kaibigan sa tabi ng iyong pangalan.',
        },
        pictures: [
          {
            src: profileIcons,
            alt: { en: 'My profile with the grid of pixel icons and the row of background colours', tl: 'Ang Aking profile na may mga pixel na icon at mga kulay sa likod' },
          },
        ],
      },
    ],
  },
  {
    id: '2026-11-20-pinned-note',
    date: '2026-11-20',
    title: { en: 'Share a note: pin it to your profile', tl: 'Magbahagi ng tala: i-pin ito sa iyong profile' },
    intro: {
      en: 'Wrote something you’d like your friends to read? Pin one note to your profile and it shows under your tree, for every member.',
      tl: 'May naisulat ka bang gusto mong mabasa ng iyong mga kaibigan? Mag-pin ng isang tala sa iyong profile at lalabas ito sa ilalim ng iyong puno, para sa lahat ng miyembro.',
    },
    sections: [
      {
        heading: { en: 'Pin it from My notes or your profile', tl: 'I-pin mula sa Aking mga tala o sa iyong profile' },
        text: {
          en: 'Press Pin on a note in My notes, or go to Menu → My profile → Shared note → Choose a note. It sits on a sheet of paper just under your tree (never over it), and under your tree when friends visit. Their pinned notes show the same way under theirs.',
          tl: 'Pindutin ang I-pin sa isang tala sa Aking mga tala, o pumunta sa Menu → My profile → Ibinahaging tala → Pumili ng tala. Nakalagay ito sa isang papel sa ilalim mismo ng iyong puno (hindi kailanman sa ibabaw nito), at sa ilalim ng iyong puno kapag dumadalaw ang mga kaibigan. Ganoon din lumalabas ang naka-pin nilang tala sa ilalim ng kanilang puno.',
        },
        pictures: [
          {
            src: pinnedNote,
            alt: {
              en: 'A friend’s pinned note on ruled paper with a red push-pin, under their tree',
              tl: 'Ang naka-pin na tala ng isang kaibigan sa papel na may guhit at pulang aspile, sa ilalim ng kanilang puno',
            },
          },
        ],
      },
      {
        heading: { en: 'Only that one note is shared', tl: 'Ang isang talang iyon lang ang ibinabahagi' },
        text: {
          en: 'Your notes stay locked so only you can read them. Pinning one saves a readable copy of just that note, and the app asks first. Editing the note updates the pin, and Unpin (or deleting the note) takes it down.',
          tl: 'Mananatiling naka-lock ang iyong mga tala kaya ikaw lang ang makakabasa. Kapag nag-pin ka ng isa, isang kopyang nababasa ng talang iyon lang ang mase-save, at magtatanong muna ang app. Kapag in-edit mo ang tala, susunod ang pin, at maaalis ito kapag pinindot mo ang Alisin ang pin (o binura ang tala).',
        },
      },
    ],
  },
  {
    id: '2026-11-18-profile-icons',
    date: '2026-11-18',
    title: { en: 'Profile icons', tl: 'Mga icon ng profile' },
    intro: {
      en: 'Pick a little pixel picture to stand beside your name — a crown, a dove, a cat in sunglasses, a snowman and more — on the colour you like.',
      tl: 'Pumili ng maliit na pixel na larawan na tatabi sa iyong pangalan — korona, kalapati, pusang naka-shades, taong-niyebe at iba pa — sa kulay na gusto mo.',
    },
    sections: [
      {
        heading: { en: 'Choose your icon', tl: 'Pumili ng iyong icon' },
        text: {
          en: 'Open Menu → My profile and press Change beside Your icon. There are forty-one to choose from, from a DJ cat with headphones to a hot-air balloon, and each sits on its own colour. Pick a different background if you like — sky, rose, mint, night and more — or none at all. Your friends see it next to your name in their list and on your profile, and you can switch any time.',
          tl: 'Buksan ang Menu → Aking profile at pindutin ang Palitan sa tabi ng Iyong icon. May apatnapu’t isang mapagpipilian, mula sa DJ na pusang may headphones hanggang sa lobo, at bawat isa ay may sariling kulay. Pumili ng ibang kulay sa likod kung gusto mo — langit, rosas, mint, gabi at iba pa — o wala. Makikita ito ng iyong mga kaibigan sa tabi ng iyong pangalan sa kanilang listahan at sa iyong profile, at mapapalitan mo ito anumang oras.',
        },
        pictures: [
          {
            src: profileIcons,
            alt: { en: 'My profile with the DJ cat chosen, the grid of pixel icons and the row of background colours', tl: 'Ang Aking profile na napili ang DJ na pusa, ang mga pixel na icon at ang mga kulay sa likod' },
          },
        ],
      },
    ],
  },
  {
    id: '2026-11-18-edit-notes',
    date: '2026-11-18',
    title: { en: 'Edit your notes', tl: 'I-edit ang iyong mga tala' },
    intro: {
      en: 'Spotted a typo, or remembered something you meant to write? You can now change your older notes.',
      tl: 'May napansing mali sa pagsulat, o may naalalang gusto mong isulat? Mababago mo na ngayon ang iyong mga lumang tala.',
    },
    sections: [
      {
        heading: { en: 'Press Edit on any note', tl: 'Pindutin ang I-edit sa anumang tala' },
        text: {
          en: 'In My notes, press Edit beside a note to change its subject or words, then Save changes. The note keeps its date and the growth it already gave your tree, and it stays locked so only you can read it. A note written offline can be edited too, before it uploads.',
          tl: 'Sa Aking mga tala, pindutin ang I-edit sa tabi ng isang tala para baguhin ang paksa o mga salita nito, saka I-save ang pagbabago. Mananatili ang petsa ng tala at ang paglagong naibigay na nito sa iyong puno, at mananatili itong naka-lock kaya ikaw lang ang makakabasa. Maaari ring i-edit ang talang isinulat offline, bago pa ito ma-upload.',
        },
      },
    ],
  },
  {
    id: '2026-11-16-more-trees',
    date: '2026-11-16',
    title: { en: 'Twelve new trees', tl: 'Labindalawang bagong puno' },
    intro: {
      en: 'There are twelve more trees to choose from, and each one grows in its own native land.',
      tl: 'Labindalawa pang puno ang mapagpipilian, at bawat isa ay lumalago sa sarili nitong katutubong lupain.',
    },
    sections: [
      {
        heading: { en: 'Twelve new trees, twelve new lands', tl: 'Labindalawang bagong puno, labindalawang bagong lupain' },
        text: {
          en: 'The jacaranda now grows in Argentina, the rainbow eucalyptus by the sea in Mindanao, the Socotra tree below the cliffs of its island home, the royal poinciana on the red hills of Madagascar, the golden shower in India, the magnolia in the southern United States, the blue spruce below Colorado’s mountains, the Persian silk tree in Iran, the baobab in sight of Kilimanjaro, the ginkgo among the granite peaks of eastern China, the pink trumpet by the bay of Rio in Brazil, and the monkey puzzle beneath Chile’s volcanoes. Choose a tree from the menu to visit its land.',
          tl: 'Tumutubo na ngayon ang jacaranda sa Argentina, ang bagras sa tabing-dagat ng Mindanao, ang puno ng Socotra sa paanan ng mga talampas ng isla nito, ang arbol de fuego sa mapupulang burol ng Madagascar, ang golden shower sa India, ang magnolia sa timog ng Estados Unidos, ang asul na spruce sa paanan ng mga bundok ng Colorado, ang Persian silk sa Iran, ang baobab na tanaw ang Kilimanjaro, ang ginkgo sa gitna ng mga batong tuktok ng silangang Tsina, ang rosas na trumpeta sa tabi ng look ng Rio sa Brazil, at ang monkey puzzle sa paanan ng mga bulkan ng Chile. Pumili ng puno sa menu para bisitahin ang lupain nito.',
        },
        row: true,
        pictures: [
          [landJacaranda, 'jacaranda', 'Argentina', 'jacaranda', 'Argentina'],
          [landEucalyptus, 'rainbow eucalyptus', 'Mindanao', 'bagras', 'Mindanao'],
          [landSocotra, 'Socotra tree', 'Socotra, Yemen', 'puno ng Socotra', 'Socotra, Yemen'],
          [landPoinciana, 'royal poinciana', 'Madagascar', 'arbol de fuego', 'Madagascar'],
          [landGoldenshower, 'golden shower tree', 'India', 'golden shower', 'India'],
          [landMagnolia, 'magnolia', 'the southern United States', 'magnolia', 'timog ng Estados Unidos'],
          [landSpruce, 'blue spruce', 'Colorado', 'asul na spruce', 'Colorado'],
          [landSilktree, 'Persian silk tree', 'Iran', 'Persian silk', 'Iran'],
          [landBaobab, 'baobab', 'Tanzania', 'baobab', 'Tanzania'],
          [landGinkgo, 'ginkgo', 'eastern China', 'ginkgo', 'silangang Tsina'],
          [landTrumpet, 'pink trumpet tree', 'Brazil', 'rosas na trumpeta', 'Brazil'],
          [landMonkeypuzzle, 'monkey puzzle', 'Chile', 'monkey puzzle', 'Chile'],
        ].map(([src, tree, en, treeTl, tl]) => ({
          src,
          label: { en: cap(en), tl: cap(tl) },
          alt: { en: `The ${tree} in its native land, ${en}`, tl: `Ang ${treeTl} sa katutubong lupain nito, ${tl}` },
        })),
      },
    ],
  },
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
          en: 'The oak grows in the English countryside, the sakura below Mt Fuji in Japan, the maple by Canada’s lakes and mountains, the apple in Kazakhstan’s orchards, the birch in the forests of Russia and Finland, the willow by a river in China, and the pine on the rice terraces of the Philippines. Choose a tree from the menu to visit its land.',
          tl: 'Sa kanayunan ng Inglatera tumutubo ang roble, sa paanan ng Bundok Fuji sa Hapon ang sakura, sa tabi ng mga lawa at bundok ng Canada ang maple, sa mga taniman ng Kazakhstan ang mansanas, sa mga kagubatan ng Rusya at Finland ang birch, sa tabi ng ilog sa Tsina ang willow, at sa mga hagdan-hagdang palayan ng Pilipinas ang pino. Pumili ng puno sa menu para bisitahin ang lupain nito.',
        },
        row: true,
        pictures: [
          [landOak, 'oak', 'England', 'Roble', 'Inglatera'],
          [landSakura, 'sakura', 'Japan', 'Sakura', 'Hapon'],
          [landMaple, 'maple', 'Canada', 'Maple', 'Canada'],
          [landApple, 'apple', 'Kazakhstan', 'Mansanas', 'Kazakhstan'],
          [landBirch, 'birch', 'Russia and Finland', 'Birch', 'Rusya at Finland'],
          [landWillow, 'willow', 'China', 'Willow', 'Tsina'],
          [landPine, 'pine', 'the Philippines', 'Pino', 'Pilipinas'],
        ].map(([src, tree, en, treeTl, tl]) => ({
          src,
          label: { en: en.replace(/^the /, 'The '), tl },
          alt: { en: `The ${tree} tree in its native land, ${en}`, tl: `Ang punong ${treeTl.toLowerCase()} sa katutubong lupain nito, ${tl}` },
        })),
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
