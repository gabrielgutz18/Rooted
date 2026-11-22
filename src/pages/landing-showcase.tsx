import type { ReactNode } from 'react';
import { SPECIES } from '../scene/species';
import { useLang, useT, type Lang } from '../lib/i18n';
import './landing-showcase.css';

// Pictures of the real app, taken by e2e/showcase.shots.ts in trial mode with a made-up
// church family (Grace, Joy, Mark and Ana). Retake them when the app's look changes:
//   SHOWCASE=1 npx playwright test -c playwright.showcase.config.ts showcase
import appDesktop from '../assets/landing/app-desktop.png';
import appPhone from '../assets/landing/app-phone.png';
import note from '../assets/landing/note.png';
import growSprout from '../assets/landing/grow-sprout.png';
import growSapling from '../assets/landing/grow-sapling.png';
import growGrown from '../assets/landing/grow-grown.png';
import lamp from '../assets/landing/lamp.png';
import progress from '../assets/landing/progress.png';
import friend from '../assets/landing/friend.png';
import picker from '../assets/landing/picker.png';
import hour07 from '../assets/landing/hour-07.png';
import hour13 from '../assets/landing/hour-13.png';
import hour18 from '../assets/landing/hour-18.png';
import hour22 from '../assets/landing/hour-22.png';
// from e2e/visit.spec.ts (2-hand-on-the-tree.png, cropped to Jesus and the tree)
import visit from '../assets/landing/visit.png';

interface Row {
  title: string;
  body: string;
  alt: string;
}

// This section's own text, kept here so it doesn't touch src/lib/i18n.tsx.
const COPY = {
  en: {
    seeTitle: 'See it grow',
    seeLead: 'Your tree, your notes and your friends on one page, on a computer or a phone.',
    desktopAlt: 'Rooted on a computer: a pink sakura tree under a blue sky, a 23-day streak lamp, friends in the side menu, and today’s note below.',
    phoneAlt: 'Rooted on a phone: a purple jacaranda at sunset with a 9-day streak lamp.',
    tourTitle: 'A closer look',
    note: {
      title: 'See what each note grows',
      body: 'As you write, Rooted shows how much your tree will grow, and why: Scripture, prayer, cell group, gratitude. Notes in Tagalog count just the same.',
      alt: 'Today’s note about cell group and Psalm 23, earning +37 growth for showing up, cell group, prayer, gratitude, reflection and Scripture.',
    },
    grow: {
      title: 'From a sprout to a grown tree',
      body: 'Every note adds up. Your tree grows through seven stages, from a seed to an ancient tree, and birds, squirrels and deer move in along the way.',
      alt: 'The same sakura tree as a sprout, a sapling and a grown tree.',
    },
    visit: {
      title: 'A surprise visit from Jesus',
      body: 'Now and then, at a time you won’t know ahead, Jesus comes to your tree. He walks about and rests His hand on it, even when it’s just a seed. The note you write while He’s there grows your tree 3×.',
      alt: 'Jesus in a white robe and red sash, with His hand on an oak tree at sunset.',
    },
    lamp: {
      title: 'A lamp for your daily streak',
      body: 'Write each day and the flame changes colour: ember, gold, emerald, sky and beyond. Miss a few days and the leaves start to fall. One note brings them back.',
      alt: 'At night, a lamp post glows with a blue flame beside an oak tree, under a card that reads “Your daily streak: 41 days”.',
    },
    progress: {
      title: 'A year of green squares',
      body: 'Each day you write fills in a square. The more your tree grew that day, the greener it is.',
      alt: 'A year of progress squares, mostly green, with 245 notes in the last year.',
    },
    friend: {
      title: 'Visit your friends’ trees',
      body: 'See how your cell group is growing: their tree, their squares and their lamp. Their notes stay private.',
      alt: 'Visiting Joy’s purple jacaranda tree, with Joy’s progress below it.',
    },
    trees: (n: number): Row => ({
      title: `${n} trees from around the world`,
      body: 'Oak, sakura, jacaranda, baobab, the new coconut palm by the sea and more, each standing in the land it comes from. Change it any time and your growth stays the same.',
      alt: 'The tree picker: oak, sakura, maple, apple, birch, willow, pine, jacaranda, rainbow eucalyptus and socotra, each in its own land.',
    }),
    dayTitle: 'Morning to night',
    dayLead: 'The sky over your tree follows the clock where you are: sunrise, noon, sunset and stars.',
    hours: ['Morning', 'Noon', 'Evening', 'Night'],
    hoursAlt: (when: string) => `The sakura tree in the ${when.toLowerCase()}`,
  },
  tl: {
    seeTitle: 'Panoorin itong lumago',
    seeLead: 'Ang iyong puno, mga tala at mga kaibigan sa iisang pahina, sa computer man o sa telepono.',
    desktopAlt: 'Ang Rooted sa computer: isang pink na punong sakura sa ilalim ng bughaw na langit, ilawan ng 23 sunod-sunod na araw, mga kaibigan sa gilid na menu, at ang tala ngayong araw sa ibaba.',
    phoneAlt: 'Ang Rooted sa telepono: isang lilang jacaranda sa paglubog ng araw, may ilawan ng 9 na sunod-sunod na araw.',
    tourTitle: 'Mas malapitang tingin',
    note: {
      title: 'Makikita mo ang ipinalalago ng bawat tala',
      body: 'Habang sumusulat ka, ipinapakita ng Rooted kung gaano lalago ang iyong puno at kung bakit: Kasulatan, panalangin, cell group, pasasalamat. Pareho ang bilang ng mga talang Tagalog.',
      alt: 'Ang tala ngayong araw tungkol sa cell group at Awit 23, na may +37 na paglago para sa pagdalo, cell group, panalangin, pasasalamat, pagninilay at Kasulatan.',
    },
    grow: {
      title: 'Mula usbong hanggang ganap na puno',
      body: 'Nadaragdag ang bawat tala. Dumaraan ang iyong puno sa pitong yugto, mula binhi hanggang matandang puno, at dumarating ang mga ibon, ardilya at usa habang lumalago ito.',
      alt: 'Ang iisang punong sakura bilang usbong, batang puno at ganap na puno.',
    },
    visit: {
      title: 'Isang sorpresang pagdalaw ni Hesus',
      body: 'Paminsan-minsan, sa oras na hindi mo alam, dumarating si Hesus sa iyong puno. Naglalakad Siya sa paligid at ipinapatong ang Kanyang kamay dito, kahit binhi pa lang ito. 3× ang ipapalago sa iyong puno ng talang isusulat mo habang narito Siya.',
      alt: 'Si Hesus na nakaputing damit at pulang banda, nakahawak sa isang punong roble sa paglubog ng araw.',
    },
    lamp: {
      title: 'Ilawan para sa sunod-sunod mong araw',
      body: 'Sumulat araw-araw at nagbabago ang kulay ng apoy: baga, ginto, esmeralda, langit at higit pa. Lumiban nang ilang araw at magsisimulang malaglag ang mga dahon. Isang tala lang, babalik ang mga ito.',
      alt: 'Sa gabi, kumikinang ang poste ng ilawan na may asul na apoy sa tabi ng punong oak, sa ilalim ng kard na “Sunod-sunod na araw: 41”.',
    },
    progress: {
      title: 'Isang taon ng berdeng parisukat',
      body: 'Bawat araw na sumulat ka ay pumupuno ng isang parisukat. Kung mas lumago ang iyong puno sa araw na iyon, mas berde ito.',
      alt: 'Isang taon ng mga parisukat ng progreso, karamihan ay berde, na may 245 tala sa nakaraang taon.',
    },
    friend: {
      title: 'Bisitahin ang puno ng mga kaibigan',
      body: 'Tingnan kung paano lumalago ang iyong cell group: ang kanilang puno, mga parisukat at ilawan. Pribado pa rin ang kanilang mga tala.',
      alt: 'Binibisita ang lilang punong jacaranda ni Joy, kasama ang progreso ni Joy sa ibaba.',
    },
    trees: (n: number): Row => ({
      title: `${n} puno mula sa iba’t ibang panig ng mundo`,
      body: 'Oak, sakura, jacaranda, baobab, ang bagong niyog sa tabing-dagat at iba pa, bawat isa ay nakatayo sa lupaing pinagmulan nito. Palitan ito anumang oras at mananatili ang iyong paglago.',
      alt: 'Ang pagpili ng puno: oak, sakura, maple, apple, birch, willow, pine, jacaranda, rainbow eucalyptus at socotra, bawat isa sa sariling lupain.',
    }),
    dayTitle: 'Mula umaga hanggang gabi',
    dayLead: 'Sumusunod ang langit ng iyong puno sa oras kung nasaan ka: pagsikat ng araw, tanghali, paglubog ng araw at mga bituin.',
    hours: ['Umaga', 'Tanghali', 'Takipsilim', 'Gabi'],
    hoursAlt: (when: string) => `Ang punong sakura sa ${when.toLowerCase()}`,
  },
} satisfies Record<Lang, unknown>;

const HOURS = [hour07, hour13, hour18, hour22];

/** A picture of the app; below the fold, so it loads as it's scrolled to. */
function Shot({ src, alt, w, h, className = '' }: { src: string; alt: string; w: number; h: number; className?: string }) {
  return <img className={`show-img ${className}`} src={src} alt={alt} width={w} height={h} loading="lazy" decoding="async" />;
}

function TourRow({ row, kind, children }: { row: Row; kind: string; children: ReactNode }) {
  return (
    <li className={`show-row show-row-${kind}`}>
      <figure className="show-figure">{children}</figure>
      <div className="show-text">
        <h3 className="landing-h3">{row.title}</h3>
        <p className="muted">{row.body}</p>
      </div>
    </li>
  );
}

/** The landing page's pictures of the app: on a computer and a phone, then a closer look. */
export default function LandingShowcase() {
  const t = useT();
  const c = COPY[useLang()];
  const trees = c.trees(SPECIES.length);

  return (
    <>
      <section id="see-it" className="landing-section show" aria-labelledby="see-title">
        <div className="show-head">
          <h2 id="see-title" className="landing-h2">
            {c.seeTitle}
          </h2>
          <p className="muted">{c.seeLead}</p>
        </div>
        <div className="show-devices">
          <figure className="show-browser">
            <div className="show-bar" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>rooted</span>
            </div>
            <Shot src={appDesktop} alt={c.desktopAlt} w={1280} h={800} />
          </figure>
          <figure className="show-phone">
            <Shot src={appPhone} alt={c.phoneAlt} w={390} h={844} />
          </figure>
        </div>
      </section>

      <section className="landing-section show" aria-labelledby="tour-title">
        <h2 id="tour-title" className="landing-h2">
          {c.tourTitle}
        </h2>
        <ol className="show-tour">
          <TourRow row={c.note} kind="note">
            <Shot className="show-framed" src={note} alt={c.note.alt} w={822} h={496} />
          </TourRow>
          <TourRow row={c.grow} kind="grow">
            <div className="show-stages" role="img" aria-label={c.grow.alt}>
              {[
                { src: growSprout, stage: 1 },
                { src: growSapling, stage: 3 },
                { src: growGrown, stage: 5 },
              ].map((s) => (
                <div key={s.stage} className="show-stage">
                  <img className="show-img show-framed" src={s.src} alt="" width={1032} height={592} loading="lazy" decoding="async" />
                  <span className="tag">{t.stages[s.stage]}</span>
                </div>
              ))}
            </div>
          </TourRow>
          <TourRow row={c.visit} kind="visit">
            <Shot className="show-framed" src={visit} alt={c.visit.alt} w={600} h={442} />
          </TourRow>
          <TourRow row={c.lamp} kind="lamp">
            <Shot className="show-framed" src={lamp} alt={c.lamp.alt} w={340} h={552} />
          </TourRow>
          <TourRow row={c.progress} kind="progress">
            <Shot className="show-framed" src={progress} alt={c.progress.alt} w={822} h={235} />
          </TourRow>
          <TourRow row={c.friend} kind="friend">
            <Shot className="show-framed" src={friend} alt={c.friend.alt} w={1280} h={800} />
          </TourRow>
          <TourRow row={trees} kind="trees">
            <Shot className="show-framed" src={picker} alt={trees.alt} w={1280} h={800} />
          </TourRow>
        </ol>

        <div className="show-day">
          <div className="show-head">
            <h3 className="landing-h3">{c.dayTitle}</h3>
            <p className="muted">{c.dayLead}</p>
          </div>
          <ol className="show-hours">
            {c.hours.map((when, i) => (
              <li key={i}>
                <figure className="show-hour">
                  <Shot className="show-framed" src={HOURS[i]} alt={c.hoursAlt(when)} w={1032} h={592} />
                  <figcaption className="tag">{when}</figcaption>
                </figure>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
