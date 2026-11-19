// The app speaks English (default) or Tagalog. The choice is kept in this browser.
// Every piece of text a person reads lives here, so a new screen gets both languages.
// Notes themselves can be written in either language — the analyzer reads both.

import { useSyncExternalStore, type ReactNode } from 'react';
import type { Period } from '../scene/engine';
import type { Platform } from './install';
import { SPECIES, type SpeciesId } from '../scene/species';
import { LANDS } from '../scene/lands';
import { ARRIVALS, STAGES, SUBJECT_PROMPTS, VERSES } from './growth';
import { LEAVES_GONE_DAYS, type FlameId } from './streak';
import type { AvatarId, BackdropId } from './avatars';

export type Lang = 'en' | 'tl';

/** Each language is named in its own words, so anyone can find theirs. */
export const LANGS: { id: Lang; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'tl', name: 'Tagalog' },
];

// ---------- English ----------

const en = {
  /** Locale for dates; undefined follows the browser. */
  locale: undefined as string | undefined,
  language: 'Language',
  planting: 'Planting…',
  loading: 'Loading…',

  // side menu
  menu: '☰ Menu',
  mainNav: 'Main',
  myTree: 'My tree',
  chooseTree: 'Choose tree',
  installApp: 'Install app',
  updatesMenu: 'Updates',
  developerMenu: 'About the developer',
  adminUsers: 'Admin · users',
  friends: 'Friends',
  noFriends: 'No one else has planted a tree yet. Invite a friend to sign up.',
  visitTree: (name: string) => `Visit ${name}'s tree`,
  synced: 'Synced to your account',
  trial: 'Trial mode · this browser only',
  signOut: 'Sign out',
  signOutConfirm: (n: number) =>
    `${n} ${n === 1 ? "note hasn't" : "notes haven't"} been uploaded yet. Signing out now deletes ${n === 1 ? 'it' : 'them'} from this device. Sign out anyway?`,

  // offline
  offlineKept: "You're offline — note kept on this device. It saves to your account when you're back online.",
  offlineSaved: (n: number) => `${n} ${n === 1 ? 'note' : 'notes'} written offline saved to your account.`,
  offlineUploadFailed: (m: string) => `A note written offline couldn't upload yet: ${m}`,
  showingCached: "Couldn't reach the server — showing your tree from last time.",

  // progress
  progress: 'Progress',
  streak: (n: number) => `${n}-day streak`,

  // the streak lamp (src/lib/streak.ts)
  yourStreak: 'Your daily streak',
  streakDays: (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`,
  flames: { ember: 'Ember', gold: 'Gold', emerald: 'Emerald', sky: 'Sky', sapphire: 'Sapphire', violet: 'Violet', glory: 'Glory' } as Record<FlameId, string>,
  flameLine: (flame: string, next: number | null) => (next ? `${flame} flame · new color at ${next}` : `${flame} flame · the brightest`),
  lampOut: 'Write a note to light the lamp',
  keepLit: 'Write today to keep it burning',
  lampLit: 'Your lamp is lit!',
  newFlame: (flame: string) => `New flame: ${flame}!`,
  lampStoke: 'Stoke the flame',
  lampShake: 'Shake the lamp',
  hideStreak: 'Hide the streak card',
  showStreak: 'Show the streak card',
  // a friend's lantern on its lamp post (no name or numbers on screen)
  postLabel: (flame: string | null) =>
    flame ? `A lamp post with a ${flame} flame. Press to stoke the fire.` : 'A lamp post with its lamp out. Press to swing it.',
  lampLabel: (n: number, flame: string | null) => (flame ? `Daily streak: ${n} ${n === 1 ? 'day' : 'days'}, ${flame} flame` : 'Daily streak: the lamp is out'),

  // a tree left alone loses its leaves
  wilting: (days: number) =>
    days >= LEAVES_GONE_DAYS
      ? `No notes for ${days} days — the leaves have fallen. One note brings them back.`
      : `No notes for ${days} days — your tree is losing its leaves. Write one to bring them back.`,
  wiltingTheirs: (name: string) => `${name}’s tree is losing its leaves.`,
  theirProgress: (name: string) => `${name}’s progress`,
  viewProfile: 'View profile',
  theirProfile: (name: string) => `${name}’s profile`,
  noNotesYet: 'No notes yet',
  statGrowth: 'growth',
  statNotes: 'notes',
  statStage: 'stage',
  statStreak: 'day streak',
  notesPrivate: 'Notes are private — friends only see the tree and the progress squares.',

  // admin
  users: 'Users',
  total: (n: number) => `${n} total`,
  col: { name: 'Name', username: 'Username', email: 'Email', stage: 'Stage', growth: 'Growth', notes: 'Notes', last: 'Last note', joined: 'Joined', password: 'Password' },
  adminReset: 'Reset',
  adminResetConfirm: (name: string) =>
    `Give ${name} a new password?\n\nTheir old password stops working. If they still have their recovery key, their notes reopen with it; if not, the notes written so far stay locked.`,
  adminResetDone: (name: string) => `New password for ${name}:`,
  adminResetHint: 'Give it to them in person or by message. It is shown only once.',

  // writing a note
  todaysNote: 'Today’s note',
  subject: 'Subject',
  note: 'Note',
  notePlaceholder: 'Write it like a diary — what happened, what you learned, verses you read, who you prayed for…',
  plusGrowth: (n: number) => `+${n} growth`,
  startWriting: 'Start writing in English or Tagalog — the tree reads your words and grows.',
  writeFirst: 'Write a subject or a note first.',
  couldNotSave: (m: string) => (m ? `Could not save: ${m}` : 'Could not save. Try again.'),
  autoDate: 'Date and time are saved automatically.',
  offlineNote: "Offline — notes are kept on this device and upload when you're back online.",
  saving: 'Saving…',
  saveNote: 'Save note',
  partShow: 'Showing up',
  partScripture: (n: number) => `Scripture ×${n}`,
  partWords: (n: number) => `${n} words written`,
  partOffTopic: 'Not about faith',
  offTopicHint: 'Write about church, prayer, the Bible or what God is teaching you, and the tree grows more.',
  prompts: SUBJECT_PROMPTS,

  // spam (src/lib/spam.ts)
  junkWords: (words: string[]) => `That looks like random typing (${words.map((w) => `“${w}”`).join(', ')}). Use real words to save the note.`,
  junkRepeat: 'The same words over and over can’t be saved. Write it in your own words.',
  junkShort: 'Write a few real words first.',
  sameNote: 'You already saved this note.',
  tooFast: (wait: string) => `One note a minute, please. You can save again in ${wait}.`,
  tooMany: (n: number, wait: string) => `You’ve written ${n} notes in the last 24 hours, the most for one day. You can save again in ${wait}.`,
  inTime: (ms: number) => {
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s} ${s === 1 ? 'second' : 'seconds'}`;
    const m = Math.ceil(s / 60);
    if (m < 60) return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
    const h = Math.floor(m / 60), rest = m % 60;
    return `${h} ${h === 1 ? 'hour' : 'hours'}${rest ? ` ${rest} min` : ''}`;
  },

  // my notes
  myNotes: 'My notes',
  noteCount: (n: number) => `${n} ${n === 1 ? 'note' : 'notes'}`,
  waitingCount: (n: number) => `${n} waiting to upload`,
  pendingTag: 'waiting to upload',
  pendingTitle: "Saved on this device. It uploads to your account when you're back online.",
  searchNotes: 'Search my notes…',
  searchLabel: 'Search notes',
  noNotes: 'No notes yet.',
  firstNote: 'Write your first one above and watch the seed wake up.',
  nothingMatches: 'Nothing matches.',
  showLess: 'Show less',
  readMore: 'Read more',
  yesDelete: 'Yes, delete',
  keep: 'Keep',
  del: 'Delete',
  editBtn: 'Edit',
  editNote: (subject: string) => `Edit “${subject}”`,
  saveChanges: 'Save changes',
  cancel: 'Cancel',
  editKeeps: 'The note keeps its date and the growth it earned.',
  editNeedsOnline: "You're offline — changes to a saved note need a connection. Try again when you're back online.",

  // progress squares
  dayTitle: (count: number, points: number, date: string) => `${count} ${count === 1 ? 'note' : 'notes'} · +${points} growth — ${date}`,
  nothingYet: (date: string) => `Nothing yet — ${date}`,
  yearNotes: (n: number) => `${n} notes in the last year`,
  less: 'Less',
  more: 'More',

  // the tree
  greeting: { dawn: 'Good morning', day: 'Good day', dusk: 'Good evening', night: 'Good night' } as Record<Period, string>,
  yourTree: 'Your tree',
  treeLabel: (owner: string | undefined, stage: string) =>
    `${owner ? `${owner}'s` : 'Your'} tree: ${stage}. Press to shake the branches and read a verse.`,
  backToMine: '← My tree',
  visiting: (owner: string): ReactNode => (
    <>
      Visiting <strong>{owner}</strong>’s tree
    </>
  ),
  growthPoints: (n: number) => `${n} growth`,
  toNextLabel: 'Progress to next stage',
  toNext: (n: number, stage: string): ReactNode => (
    <>
      {n} more to <strong>{stage}</strong>
    </>
  ),
  fullyGrown: 'Fully grown — keep tending it.',
  treeGrew: 'The tree grew!',
  stages: STAGES.map((s) => s.name),
  /** Shown when an animal arrives, keyed by the stage it arrives at. */
  arrived: Object.fromEntries(ARRIVALS.map((a) => [a.stage, `${a.name} moved in!`])) as Record<number, string>,
  verses: VERSES,
  bible: 'KJV',

  // choosing a tree
  pickFirstTitle: 'Which tree will you grow?',
  pickTitle: 'Choose your tree',
  keepOak: 'Keep the oak',
  close: 'Close',

  // Menu → Updates (the notices themselves are in src/lib/updates.ts)
  updatesKicker: 'Update notice',
  updatesTitle: 'What’s new in Rooted',
  updatesGreeting: 'Dear friend, here is what has grown in Rooted lately.',
  updatesNew: 'New',
  updatesSignoff: 'Thank you for writing, and for growing with us.',
  updatesRollUp: 'Roll up the scroll',

  // Menu → About the developer (src/pages/developer.tsx, at /developer)
  dev: {
    pageTitle: 'About the developer · Rooted',
    kicker: 'About the developer',
    title: 'Hi, I’m Gabriel',
    body: [
      'The idea came when I joined SUYNL. I haven’t really started my Bible journey yet, but I’ve read some verses, and I wanted a simple place to write down what stood out to me.',
      'That’s Rooted: write a note, and a little tree grows with you.',
    ],
    signature: '— Gabriel',
    iconAlt: 'Gabriel’s icon',
    portfolio: 'View my portfolio',
    madeWith: 'Made with',
    back: 'Back to Rooted',
  },

  pickFirstBlurb: 'Every note you write helps it grow. You can switch any time.',
  pickBlurb: 'Your growth stays the same — only the kind of tree changes.',
  growing: 'growing',
  species: Object.fromEntries(SPECIES.map((s) => [s.id, { name: s.name, blurb: s.blurb, land: LANDS[s.id].name }])) as Record<
    SpeciesId,
    { name: string; blurb: string; land: string }
  >,
  /** Under each tree in the picker: where it comes from (its land is drawn behind it). */
  nativeTo: (land: string) => `Native to ${land}`,

  // the landing page (src/pages/landing.tsx): the first page for someone not signed in
  landingLead: 'Write a few lines about church, cell group, Bible study or prayer, and a pixel tree grows from your words.',
  tryNow: 'Try now',
  installShort: 'Install',
  landingInstalled: 'Installed — open Rooted from your home screen or desktop.',
  haveTree: 'Already planted a tree?',
  howItWorks: 'How it works',
  landingStage: (stage: string) => `Growing · ${stage}`,
  landingSteps: [
    {
      title: 'Write today’s note',
      body: 'Like a diary: what happened, what you learned, verses you read, who you prayed for. In English or Tagalog.',
    },
    {
      title: 'Your tree grows',
      body: 'The tree reads your words, and Scripture and faith grow it most. Butterflies, birds, deer and even monkeys move in as it grows.',
    },
    {
      title: 'Keep the lamp lit',
      body: 'Write each day and your streak lamp burns brighter. Leave it a while and the leaves fall — one note brings them back.',
    },
  ],
  landingWhy: 'Made for your walk of faith',
  landingFeatures: (trees: number) => [
    {
      title: 'Only you can read your notes',
      body: 'Notes are locked before they leave your device — not even the admin can read them. Friends see your tree, never your words.',
    },
    { title: 'Visit friends’ trees', body: 'Open a friend’s tree from the menu to see how they’re growing, their progress squares and their lamp.' },
    { title: `${trees} trees to choose from`, body: 'Oak, sakura, baobab, jacaranda and more, each standing in the land it comes from.' },
    { title: 'Works offline', body: 'Install it on your phone or computer. Notes written without signal upload when you’re back online.' },
  ],
  landingCta: 'Plant your tree',
  landingCtaBody: 'All it takes is a username and password — no email needed.',
  aboutRooted: 'About Rooted',

  // signing in
  tagline: 'A tree that grows with your walk of faith.',
  createAccount: 'Create account',
  signIn: 'Sign in',
  username: 'Username',
  usernameRule: '3–20 letters, numbers or _',
  password: 'Password',
  newPassword: 'New password',
  forgotPassword: 'Forgot password?',
  resetIntro: 'Enter your username, the recovery key you saved, and a new password.',
  resetAndSignIn: 'Reset & sign in',
  noRecoveryKey: 'No recovery key? Ask the admin to reset your password.',
  confirmEmail:
    'Account created, but the server is set to confirm emails, which usernames can’t do. Ask the admin to turn off “Confirm email” in Supabase.',
  pickUsernameTitle: 'Pick a username',
  pickUsernameIntro: 'From now on you’ll sign in with a username instead of your email. Your password stays the same.',
  pickUsernameReset: 'Tip: to be able to reset a forgotten password yourself, make a new recovery key afterwards (Menu → Recovery key).',
  notNow: 'Not now',
  saveUsername: 'Save username',
  usernameSaved: (name: string) => `Done — sign in as “${name}” from now on.`,

  // your profile (Menu → My profile)
  profileMenu: 'My profile',
  profileTitle: 'Your profile',
  // profile icons (src/lib/avatars.ts)
  iconTitle: 'Your icon',
  iconChoose: 'Choose your icon',
  iconChange: 'Change your icon',
  iconHint: 'It shows beside your name, for you and your friends.',
  iconOf: (name: string) => `${name}’s icon`,
  iconPick: (icon: string) => `Icon: ${icon}`,
  iconNone: 'No icon',
  iconNoneHint: 'Show the first letter of your name instead',
  avatars: {
    bottle: 'Bottle', ball: 'Ball', crown: 'Crown', book: 'Book', bread: 'Bread', shoes: 'Shoes', dove: 'Dove', fish: 'Fish',
    sheep: 'Sheep', mug: 'Mug', star: 'Star', heart: 'Heart', sunflower: 'Sunflower', apple: 'Apple', guitar: 'Guitar', cat: 'Cat',
    note: 'Music note', mushroom: 'Mushroom', rocket: 'Rocket', cake: 'Cake', coolcat: 'Cool cat', djcat: 'DJ cat', tree: 'Tree',
    snowman: 'Snowman', cap: 'Cap', frog: 'Frog', owl: 'Owl', penguin: 'Penguin', bunny: 'Bunny', dog: 'Puppy', bear: 'Bear',
    donut: 'Donut', icecream: 'Ice cream', watermelon: 'Watermelon', cactus: 'Cactus', moon: 'Moon and stars', rainbow: 'Rainbow',
    umbrella: 'Umbrella', balloon: 'Hot-air balloon', gamepad: 'Game controller', church: 'Church',
  } as Record<AvatarId, string>,
  bgTitle: 'Background',
  bgOwn: 'Its own colour',
  bgOwnHint: 'Background: the icon’s own colour',
  bgPick: (colour: string) => `Background: ${colour}`,
  backdrops: {
    sky: 'Sky', rose: 'Rose', mint: 'Mint', lemon: 'Lemon', lilac: 'Lilac', peach: 'Peach', cream: 'Cream', navy: 'Navy',
    night: 'Night', berry: 'Berry', forest: 'Forest', clear: 'No background',
  } as Record<BackdropId, string>,
  done: 'Done',
  addUsernameTag: 'Add username',
  noUsernameYet: 'None yet',
  signInWith: 'Sign in with',
  signInEmail: (email: string) => `Your email, ${email}`,
  signInEmailOnly: 'Your email',
  signInUsername: (name: string) => `Your username, “${name}”`,
  profileTree: 'Tree',
  changeTree: 'Change',
  addUsernameTitle: 'Add a username',
  addUsernameIntro:
    'Pick a username and sign in with it from now on, instead of your email. Your password, tree and notes stay the same — only your email stops working for signing in.',
  adminKeepsEmail: 'As the admin, you keep signing in with your email.',
  changeUsernameTitle: 'Change username',
  changeUsernameIntro:
    'Sign in with the new username from now on. Your old one stops working right away and anyone can take it. Your password, tree and notes stay the same.',
  newUsername: 'New username',
  checkingName: 'Checking…',
  usernameFree: (name: string) => `✓ @${name} is available`,
  usernameIsYours: "That's your username now.",
  offlineRetry: "You're offline — connect to the internet and try again.",
  pleaseWait: 'Please wait…',
  plantTree: 'Plant my tree',
  localTrial: 'Trial mode: accounts live only in this browser until Supabase is connected.',

  // private notes (encrypted on the device; see src/lib/vault.ts)
  recoveryMenu: 'Recovery key',
  lockTitle: 'Lock your notes',
  unlockTitle: 'Unlock your notes',
  onlyYou: 'only you can read them',
  lockIntro:
    'Rooted now locks every note on your device before it is saved, so only you can read it — not your friends, and not the admin. Enter your password to turn it on.',
  unlockIntro: 'Your notes are locked so only you can read them. Enter your password to open them on this device.',
  recoverIntro: 'Enter the recovery key you saved and the password you sign in with now. From then on your notes open with that password.',
  unlockOffline: "Couldn't reach the server — you need to be online to unlock.",
  recoveryKey: 'Recovery key',
  currentPassword: 'Your current password',
  useRecovery: 'Password changed or reset? Use your recovery key',
  back: 'Back',
  startOver: 'Lost the recovery key too? Start over',
  startOverConfirm:
    'Start over with a new key?\n\nThe notes you have written so far stay locked for good — nobody can open them, not even the admin. New notes use the new key.',
  enterPasswordFirst: 'Enter your current password first.',
  unlocking: 'Unlocking…',
  lockNotes: 'Lock my notes',
  unlock: 'Unlock',
  recoveryTitle: 'Your recovery key',
  recoveryWhy:
    'If you ever forget your password, this key resets it and opens your notes again (Sign in → Forgot password?). Nobody else has it — not even the admin.',
  recoveryKeep:
    "Keep it somewhere safe: a password manager, or written on paper. If you lose both your password and this key, your notes can't be opened by anyone.",
  copy: 'Copy',
  copied: 'Copied',
  savedIt: "I've saved it",
  newRecoveryIntro: 'Make a new recovery key. The old one stops working. Enter your password to continue.',
  making: 'Making…',
  makeNewKey: 'Make new key',
  lockedNote: 'Locked note',
  lockedNoteBody: "Locked with an older key, so it can't be opened.",
  autoDatePrivate: 'Locked so only you can read it. Date and time are saved automatically.',

  // installing (browser menu names stay as the browser shows them)
  installTitle: 'Install Rooted',
  installIntro: 'Rooted opens in its own window from your home screen or desktop, and you stay signed in.',
  installSteps: {
    ios: [
      <>
        Open this page in <strong>Safari</strong>.
      </>,
      <>
        Tap the <strong>Share</strong> button (the square with an arrow pointing up).
      </>,
      <>
        Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
      </>,
      <>Open Rooted from your Home Screen and sign in once — it remembers you from then on.</>,
    ],
    android: [
      <>
        Open the browser menu <strong>⋮</strong> (top right).
      </>,
      <>
        Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>), then <strong>Install</strong>.
      </>,
    ],
    desktop: [
      <>
        <strong>Chrome or Edge:</strong> click the install icon at the right end of the address bar, or open the menu <strong>⋮</strong> /{' '}
        <strong>…</strong> and choose <strong>Install Rooted</strong> (Chrome: Cast, save and share → Install page as app; Edge: Apps → Install
        this site as an app).
      </>,
      <>
        <strong>Safari on Mac:</strong> File → <strong>Add to Dock</strong>.
      </>,
      <>
        <strong>Firefox</strong> can't install sites as apps — open Rooted in Chrome or Edge to install it.
      </>,
    ],
  } as Record<Platform, ReactNode[]>,

  /** Tags are stored in English; this shows them in the chosen language. */
  tags: {} as Record<string, string>,
  /** Known English error messages (ours and Supabase's), shown in the chosen language. */
  errors: {} as Record<string, string>,
};

export type Strings = typeof en;

// ---------- Tagalog ----------

const tl: Strings = {
  locale: 'fil-PH',
  language: 'Wika',
  planting: 'Nagtatanim…',
  loading: 'Naglo-load…',

  menu: '☰ Menu',
  mainNav: 'Pangunahin',
  myTree: 'Aking puno',
  chooseTree: 'Pumili ng puno',
  installApp: 'I-install ang app',
  updatesMenu: 'Mga update',
  developerMenu: 'Tungkol sa developer',
  adminUsers: 'Admin · mga user',
  friends: 'Mga kaibigan',
  noFriends: 'Wala pang ibang nagtanim ng puno. Imbitahan ang isang kaibigan na mag-sign up.',
  visitTree: (name) => `Bisitahin ang puno ni ${name}`,
  synced: 'Naka-save sa iyong account',
  trial: 'Trial mode · sa browser na ito lang',
  signOut: 'Mag-sign out',
  signOutConfirm: (n) =>
    `${n} tala ang hindi pa na-upload. Kapag nag-sign out ka ngayon, mabubura ${n === 1 ? 'ito' : 'ang mga ito'} sa device na ito. Mag-sign out pa rin?`,

  offlineKept: 'Offline ka — nakatago ang tala sa device na ito. Mase-save ito sa iyong account kapag online ka na ulit.',
  offlineSaved: (n) => `${n} talang isinulat offline ang na-save na sa iyong account.`,
  offlineUploadFailed: (m) => `Hindi pa ma-upload ang talang isinulat offline: ${m}`,
  showingCached: 'Hindi maabot ang server — ipinapakita ang iyong puno mula noong huli.',

  progress: 'Pag-unlad',
  streak: (n) => `${n} araw na sunod-sunod`,

  yourStreak: 'Sunod-sunod mong araw',
  streakDays: (n) => `${n} araw`,
  flames: { ember: 'Baga', gold: 'Ginto', emerald: 'Esmeralda', sky: 'Langit', sapphire: 'Sapiro', violet: 'Lila', glory: 'Kaluwalhatian' },
  flameLine: (flame, next) => (next ? `Apoy na ${flame} · bagong kulay sa ${next}` : `Apoy na ${flame} · pinakamaliwanag`),
  lampOut: 'Sumulat ng tala para sindihan ang ilawan',
  keepLit: 'Sumulat ngayon para manatili ang apoy',
  lampLit: 'Nasindihan ang ilawan mo!',
  newFlame: (flame) => `Bagong apoy: ${flame}!`,
  lampStoke: 'Palakasin ang apoy',
  lampShake: 'Alugin ang ilawan',
  hideStreak: 'Itago ang kard ng streak',
  showStreak: 'Ipakita ang kard ng streak',
  postLabel: (flame) =>
    flame ? `Poste ng ilawan na may apoy na ${flame}. Pindutin para palakasin ang apoy.` : 'Poste ng ilawan na patay ang ilaw. Pindutin para iugoy ito.',
  lampLabel: (n, flame) => (flame ? `Sunod-sunod na araw: ${n}, apoy na ${flame}` : 'Sunod-sunod na araw: patay ang ilawan'),

  wilting: (days) =>
    days >= LEAVES_GONE_DAYS
      ? `${days} araw nang walang tala — nalagas na ang mga dahon. Isang tala lang at babalik ang mga ito.`
      : `${days} araw nang walang tala — nalalagas ang mga dahon ng puno mo. Sumulat para bumalik ang mga ito.`,
  wiltingTheirs: (name) => `Nalalagas ang mga dahon ng puno ni ${name}.`,
  theirProgress: (name) => `Pag-unlad ni ${name}`,
  viewProfile: 'Tingnan ang profile',
  theirProfile: (name) => `Profile ni ${name}`,
  noNotesYet: 'Wala pang tala',
  statGrowth: 'paglago',
  statNotes: 'tala',
  statStage: 'yugto',
  statStreak: 'araw na sunod-sunod',
  notesPrivate: 'Pribado ang mga tala — ang puno at ang mga parisukat ng pag-unlad lang ang nakikita ng mga kaibigan.',

  users: 'Mga user',
  total: (n) => `${n} lahat`,
  col: { name: 'Pangalan', username: 'Username', email: 'Email', stage: 'Yugto', growth: 'Paglago', notes: 'Tala', last: 'Huling tala', joined: 'Sumali', password: 'Password' },
  adminReset: 'I-reset',
  adminResetConfirm: (name) =>
    `Bigyan si ${name} ng bagong password?\n\nHindi na gagana ang luma niyang password. Kung nasa kanya pa ang recovery key, mabubuksan ulit ang kanyang mga tala gamit iyon; kung wala, mananatiling naka-lock ang mga talang naisulat na.`,
  adminResetDone: (name) => `Bagong password ni ${name}:`,
  adminResetHint: 'Ibigay ito sa kanya nang personal o sa mensahe. Isang beses lang ito ipapakita.',

  todaysNote: 'Tala ngayong araw',
  subject: 'Paksa',
  note: 'Tala',
  notePlaceholder: 'Isulat na parang diary — ano ang nangyari, ano ang natutunan mo, mga talatang binasa mo, sino ang ipinanalangin mo…',
  plusGrowth: (n) => `+${n} paglago`,
  startWriting: 'Magsimulang magsulat sa Tagalog o English — binabasa ng puno ang iyong mga salita at lumalago ito.',
  writeFirst: 'Sumulat muna ng paksa o tala.',
  couldNotSave: (m) => (m ? `Hindi na-save: ${m}` : 'Hindi na-save. Subukan ulit.'),
  autoDate: 'Kusang nase-save ang petsa at oras.',
  offlineNote: 'Offline — nakatago ang mga tala sa device na ito at maa-upload kapag online ka na ulit.',
  saving: 'Sine-save…',
  saveNote: 'I-save ang tala',
  partShow: 'Pagsulat ngayon',
  partScripture: (n) => `Kasulatan ×${n}`,
  partWords: (n) => `${n} salitang naisulat`,
  partOffTopic: 'Hindi tungkol sa pananampalataya',
  offTopicHint: 'Isulat ang tungkol sa simbahan, panalangin, Bibliya, o ang itinuturo sa iyo ng Diyos, at mas lalago ang puno.',

  junkWords: (words) => `Mukhang random na pagta-type ito (${words.map((w) => `“${w}”`).join(', ')}). Gumamit ng totoong mga salita para ma-save ang tala.`,
  junkRepeat: 'Hindi puwedeng i-save ang paulit-ulit na mga salita. Isulat ito sa sarili mong mga salita.',
  junkShort: 'Sumulat muna ng ilang totoong salita.',
  sameNote: 'Na-save mo na ang talang ito.',
  tooFast: (wait) => `Isang tala bawat minuto lang. Puwede kang mag-save ulit makalipas ang ${wait}.`,
  tooMany: (n, wait) => `${n} tala na ang naisulat mo sa nakaraang 24 oras, ang pinakamarami para sa isang araw. Puwede kang mag-save ulit makalipas ang ${wait}.`,
  inTime: (ms) => {
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s} segundo`;
    const m = Math.ceil(s / 60);
    if (m < 60) return `${m} minuto`;
    const h = Math.floor(m / 60), rest = m % 60;
    return `${h} oras${rest ? ` at ${rest} minuto` : ''}`;
  },
  // same order as SUBJECT_PROMPTS
  prompts: [
    'Ano ang ginawa ko ngayong araw?',
    'Ano ang natutunan ko tungkol sa Diyos ngayon?',
    'Ano ang nangyari sa simbahan?',
    'Ano ang pinag-usapan namin sa cell group?',
    'Anong talata ang tumatak sa akin ngayon?',
    'Ano ang ipinagpapasalamat ko ngayon?',
    'Ano ang pinag-aralan ko ngayon?',
    'Sino ang ipinanalangin ko ngayon?',
    'Saan ko nakita ang gawa ng Diyos ngayon?',
    'Ano ang itinuturo sa akin ng Diyos ngayong linggo?',
  ],

  myNotes: 'Aking mga tala',
  noteCount: (n) => `${n} tala`,
  waitingCount: (n) => `${n} naghihintay ma-upload`,
  pendingTag: 'naghihintay ma-upload',
  pendingTitle: 'Naka-save sa device na ito. Maa-upload ito sa iyong account kapag online ka na ulit.',
  searchNotes: 'Hanapin sa aking mga tala…',
  searchLabel: 'Hanapin ang mga tala',
  noNotes: 'Wala pang tala.',
  firstNote: 'Isulat ang una mo sa itaas at panoorin ang paggising ng binhi.',
  nothingMatches: 'Walang tumugma.',
  showLess: 'Ipakita nang kaunti',
  readMore: 'Basahin pa',
  yesDelete: 'Oo, burahin',
  keep: 'Huwag na',
  del: 'Burahin',
  editBtn: 'I-edit',
  editNote: (subject) => `I-edit ang “${subject}”`,
  saveChanges: 'I-save ang pagbabago',
  cancel: 'Kanselahin',
  editKeeps: 'Mananatili ang petsa ng tala at ang paglagong naidulot nito.',
  editNeedsOnline: 'Offline ka — kailangan ng koneksyon para baguhin ang naka-save na tala. Subukan ulit pagbalik mo online.',

  dayTitle: (count, points, date) => `${count} tala · +${points} paglago — ${date}`,
  nothingYet: (date) => `Wala pa — ${date}`,
  yearNotes: (n) => `${n} tala sa nakaraang taon`,
  less: 'Kaunti',
  more: 'Marami',

  greeting: { dawn: 'Magandang umaga', day: 'Magandang araw', dusk: 'Magandang hapon', night: 'Magandang gabi' },
  yourTree: 'Iyong puno',
  treeLabel: (owner, stage) =>
    `${owner ? `Puno ni ${owner}` : 'Iyong puno'}: ${stage}. Pindutin para yugyugin ang mga sanga at magbasa ng talata.`,
  backToMine: '← Aking puno',
  visiting: (owner) => (
    <>
      Bumibisita sa puno ni <strong>{owner}</strong>
    </>
  ),
  growthPoints: (n) => `${n} paglago`,
  toNextLabel: 'Pag-unlad patungo sa susunod na yugto',
  toNext: (n, stage) => (
    <>
      {n} pa bago maging <strong>{stage}</strong>
    </>
  ),
  fullyGrown: 'Ganap nang lumaki — patuloy itong alagaan.',
  treeGrew: 'Lumaki ang puno!',
  // same order as STAGES
  stages: ['Binhi', 'Usbong', 'Punla', 'Batang Puno', 'Lumalagong Puno', 'Ganap na Puno', 'Matandang Puno'],
  arrived: {
    1: 'Dumating ang mga paru-paro!',
    2: 'Dumating ang mga ibon!',
    3: 'Dumating ang isang ardilya!',
    4: 'Dumating ang isang raccoon!',
    5: 'Dumating ang mga usa!',
    6: 'Dumating ang mga unggoy!',
  },
  // Ang Dating Biblia (1905), public domain — same verses and order as VERSES
  verses: [
    { ref: 'Awit 1:3', text: "At siya'y magiging parang punong kahoy na itinanim sa siping ng mga agos ng tubig, na nagbubunga sa kaniyang kapanahunan, ang kaniyang dahon nama'y hindi malalanta." },
    { ref: 'Colosas 2:7', text: 'Na nangauugat at nangatatayo sa kaniya, at matibay sa inyong pananampalataya, gaya ng pagkaturo sa inyo, na sumasagana sa pagpapasalamat.' },
    { ref: 'Jeremias 17:8', text: "Sapagka't siya'y magiging parang punong kahoy na itinanim sa tabi ng tubig, at naguugat sa tabi ng ilog." },
    { ref: '2 Pedro 3:18', text: "Datapuwa't magsilago kayo sa biyaya at sa pagkakilala sa ating Panginoon at Tagapagligtas na si Jesucristo." },
    { ref: '2 Timoteo 2:15', text: 'Pagsikapan mong humarap na subok sa Dios, manggagawang walang anomang ikahihiya, na gumagamit na matuwid ng salita ng katotohanan.' },
    { ref: 'Mga Hebreo 10:25', text: "Na huwag nating pabayaan ang ating pagkakatipon, na gaya ng ugali ng iba, kundi mangagaralan sa isa't isa." },
    { ref: 'Mateo 18:20', text: "Sapagka't kung saan nagkakatipon ang dalawa o tatlo sa aking pangalan, ay naroroon ako sa gitna nila." },
    { ref: 'Awit 119:105', text: "Ang salita mo'y ilawan sa aking mga paa, at liwanag sa aking landas." },
    { ref: 'Galacia 6:9', text: 'At huwag tayong mangapagod sa paggawa ng mabuti: sapagka\'t sa kapanahunan ay magsisipagani tayo, kung hindi tayo manganghihimagod.' },
    { ref: '1 Corinto 3:6', text: "Ako ang nagtanim, si Apolos ang nagdilig; nguni't ang Dios ang siyang nagpalago." },
  ],
  bible: 'ADB 1905',

  pickFirstTitle: 'Anong puno ang palalaguin mo?',
  pickTitle: 'Piliin ang iyong puno',
  keepOak: 'Roble na lang',
  close: 'Isara',

  updatesKicker: 'Paunawa sa update',
  updatesTitle: 'Ano ang bago sa Rooted',
  updatesGreeting: 'Mahal na kaibigan, narito ang mga bagong tumubo sa Rooted nitong mga nakaraang araw.',
  updatesNew: 'Bago',
  updatesSignoff: 'Salamat sa pagsusulat, at sa paglago kasama namin.',
  updatesRollUp: 'Irolyo ang balumbon',

  dev: {
    pageTitle: 'Tungkol sa developer · Rooted',
    kicker: 'Tungkol sa developer',
    title: 'Hi, ako si Gabriel',
    body: [
      'Naisip ko ito noong sumali ako sa SUYNL. Hindi pa talaga nagsisimula ang paglalakbay ko sa Biblia, pero nakabasa na ako ng ilang talata, at gusto ko ng simpleng lugar para isulat ang mga tumatak sa akin.',
      'Iyan ang Rooted: sumulat ng tala, at may maliit na punong lalago kasama mo.',
    ],
    signature: '— Gabriel',
    iconAlt: 'Icon ni Gabriel',
    portfolio: 'Tingnan ang aking portfolio',
    madeWith: 'Ginawa gamit ang',
    back: 'Bumalik sa Rooted',
  },
  pickFirstBlurb: 'Bawat talang isusulat mo ay tumutulong sa paglago nito. Puwede kang magpalit kahit kailan.',
  pickBlurb: 'Hindi magbabago ang iyong paglago — ang uri lang ng puno ang mapapalitan.',
  growing: 'pinalalago',
  species: {
    oak: { name: 'Roble', blurb: 'Matibay at malapad, malalim ang ugat.', land: 'Inglatera' },
    sakura: { name: 'Sakura', blurb: 'Mga bulaklak ng seresa na tinatangay ng hangin.', land: 'Hapon' },
    maple: { name: 'Maple', blurb: 'Nagliliyab na pula at kahel buong taon.', land: 'Canada' },
    apple: { name: 'Mansanas', blurb: 'Namumunga sa kanyang kapanahunan.', land: 'Kazakhstan' },
    birch: { name: 'Birch', blurb: 'Matangkad at puti ang balat, matingkad ang mga dahon.', land: 'Rusya at Finland' },
    willow: { name: 'Willow', blurb: 'Mahahabang nakalaylay na hibla na umiindayog.', land: 'Tsina' },
    pine: { name: 'Pino', blurb: 'Laging luntian, tumataas nang patong-patong.', land: 'Pilipinas' },
    jacaranda: { name: 'Jacaranda', blurb: 'Isang ulap ng lilang bulaklak.', land: 'Argentina' },
    eucalyptus: { name: 'Bagras', blurb: 'Balat na may guhit ng bawat kulay ng bahaghari.', land: 'Mindanao' },
    socotra: { name: 'Puno ng Socotra', blurb: 'Payong ng mga dahon sa isang tuyong isla.', land: 'Socotra, Yemen' },
    poinciana: { name: 'Arbol de Fuego', blurb: 'Malapad na korona ng pulang-apoy na bulaklak.', land: 'Madagascar' },
    goldenshower: { name: 'Golden Shower', blurb: 'Nakabitin ang mahahabang kumpol ng dilaw na bulaklak.', land: 'India' },
    magnolia: { name: 'Magnolia', blurb: 'Makintab na dahon at malalaking puting bulaklak.', land: 'timog ng Estados Unidos' },
    spruce: { name: 'Asul na Spruce', blurb: 'Pilak-asul na mga karayom sa matataas na dalisdis.', land: 'Colorado' },
    silktree: { name: 'Persian Silk', blurb: 'Malalambot na rosas na bulaklak, parang hibla ng seda.', land: 'Iran' },
    baobab: { name: 'Baobab', blurb: 'Higanteng katawan na nag-iimbak ng tubig.', land: 'Tanzania' },
    ginkgo: { name: 'Ginkgo', blurb: 'Gintong dahong hugis-pamaypay mula sa sinaunang lahi.', land: 'silangang Tsina' },
    trumpet: { name: 'Rosas na Trumpeta', blurb: 'Biglang namumulaklak ng rosas ang mga hubad na sanga.', land: 'Brazil' },
    monkeypuzzle: { name: 'Monkey Puzzle', blurb: 'Matinik na sangang parang lubid mula pa sa panahon ng mga dinosaur.', land: 'Chile' },
  },
  nativeTo: (land) => `Katutubo sa ${land}`,

  landingLead:
    'Magsulat ng ilang linya tungkol sa simbahan, cell group, pag-aaral ng Biblia o panalangin, at lalago ang isang pixel na puno mula sa iyong mga salita.',
  tryNow: 'Subukan ngayon',
  installShort: 'I-install',
  landingInstalled: 'Na-install na — buksan ang Rooted mula sa iyong home screen o desktop.',
  haveTree: 'May puno ka na?',
  howItWorks: 'Paano ito gumagana',
  landingStage: (stage) => `Lumalago · ${stage}`,
  landingSteps: [
    {
      title: 'Isulat ang tala ngayong araw',
      body: 'Parang diary: ang nangyari, ang natutunan mo, ang mga talatang binasa mo, ang mga ipinanalangin mo. Sa English o Tagalog.',
    },
    {
      title: 'Lalago ang iyong puno',
      body: 'Binabasa ng puno ang iyong mga salita, at pinakapinalalago ito ng Kasulatan at pananampalataya. Darating ang mga paru-paro, ibon, usa at pati mga unggoy habang lumalaki ito.',
    },
    {
      title: 'Panatilihing may sindi ang lampara',
      body: 'Magsulat araw-araw at lalong liliwanag ang iyong streak lamp. Kapag matagal mong iniwan, malalagas ang mga dahon — isang tala lang at babalik ang mga ito.',
    },
  ],
  landingWhy: 'Ginawa para sa iyong paglakad sa pananampalataya',
  landingFeatures: (trees) => [
    {
      title: 'Ikaw lang ang makababasa ng iyong mga tala',
      body: 'Naka-lock ang mga tala bago pa umalis sa iyong device — kahit ang admin ay hindi makababasa nito. Nakikita ng mga kaibigan ang iyong puno, hindi ang iyong mga salita.',
    },
    {
      title: 'Bisitahin ang puno ng mga kaibigan',
      body: 'Buksan ang puno ng isang kaibigan mula sa menu para makita ang kanilang paglago, mga parisukat ng progreso at lampara.',
    },
    { title: `${trees} punong mapagpipilian`, body: 'Oak, sakura, baobab, jacaranda at iba pa, bawat isa nakatayo sa lupaing pinagmulan nito.' },
    {
      title: 'Gumagana kahit offline',
      body: 'I-install ito sa iyong phone o computer. Ang mga talang isinulat nang walang signal ay maa-upload pagbalik mo online.',
    },
  ],
  landingCta: 'Itanim ang iyong puno',
  landingCtaBody: 'Username at password lang ang kailangan — walang email.',
  aboutRooted: 'Tungkol sa Rooted',

  tagline: 'Isang punong lumalago kasabay ng iyong paglakad sa pananampalataya.',
  createAccount: 'Gumawa ng account',
  signIn: 'Mag-sign in',
  username: 'Username',
  usernameRule: '3–20 letra, numero o _',
  password: 'Password',
  newPassword: 'Bagong password',
  forgotPassword: 'Nakalimutan ang password?',
  resetIntro: 'Ilagay ang iyong username, ang recovery key na itinago mo, at isang bagong password.',
  resetAndSignIn: 'I-reset at mag-sign in',
  noRecoveryKey: 'Walang recovery key? Pakisabi sa admin na i-reset ang iyong password.',
  confirmEmail:
    'Nagawa ang account, pero naka-set ang server na magkumpirma ng email, na hindi kaya ng username. Pakisabi sa admin na i-off ang “Confirm email” sa Supabase.',
  pickUsernameTitle: 'Pumili ng username',
  pickUsernameIntro: 'Mula ngayon, username na ang gagamitin mo sa pag-sign in sa halip na email. Hindi magbabago ang iyong password.',
  pickUsernameReset:
    'Tip: para ikaw mismo ang makapag-reset ng nakalimutang password, gumawa ng bagong recovery key pagkatapos nito (Menu → Recovery key).',
  notNow: 'Mamaya na',
  saveUsername: 'I-save ang username',
  usernameSaved: (name) => `Tapos na — mag-sign in bilang “${name}” mula ngayon.`,

  profileMenu: 'Aking profile',
  profileTitle: 'Iyong profile',
  iconTitle: 'Iyong icon',
  iconChoose: 'Pumili ng iyong icon',
  iconChange: 'Palitan ang iyong icon',
  iconHint: 'Makikita ito sa tabi ng iyong pangalan, para sa iyo at sa iyong mga kaibigan.',
  iconOf: (name) => `Icon ni ${name}`,
  iconPick: (icon) => `Icon: ${icon}`,
  iconNone: 'Walang icon',
  iconNoneHint: 'Ipakita na lang ang unang titik ng iyong pangalan',
  avatars: {
    bottle: 'Bote', ball: 'Bola', crown: 'Korona', book: 'Aklat', bread: 'Tinapay', shoes: 'Sapatos', dove: 'Kalapati', fish: 'Isda',
    sheep: 'Tupa', mug: 'Tasa', star: 'Bituin', heart: 'Puso', sunflower: 'Mirasol', apple: 'Mansanas', guitar: 'Gitara', cat: 'Pusa',
    note: 'Nota', mushroom: 'Kabute', rocket: 'Rocket', cake: 'Keyk', coolcat: 'Astig na pusa', djcat: 'DJ na pusa', tree: 'Puno',
    snowman: 'Taong-niyebe', cap: 'Sumbrero', frog: 'Palaka', owl: 'Kuwago', penguin: 'Penguin', bunny: 'Kuneho', dog: 'Tuta', bear: 'Oso',
    donut: 'Donut', icecream: 'Sorbetes', watermelon: 'Pakwan', cactus: 'Kaktus', moon: 'Buwan at bituin', rainbow: 'Bahaghari',
    umbrella: 'Payong', balloon: 'Lobo', gamepad: 'Controller', church: 'Simbahan',
  },
  bgTitle: 'Kulay sa likod',
  bgOwn: 'Sariling kulay',
  bgOwnHint: 'Kulay sa likod: ang sariling kulay ng icon',
  bgPick: (colour) => `Kulay sa likod: ${colour}`,
  backdrops: {
    sky: 'Langit', rose: 'Rosas', mint: 'Mint', lemon: 'Limon', lilac: 'Lila', peach: 'Melokoton', cream: 'Krema', navy: 'Dagat',
    night: 'Gabi', berry: 'Berry', forest: 'Gubat', clear: 'Walang kulay',
  },
  done: 'Tapos na',
  addUsernameTag: 'Magdagdag ng username',
  noUsernameYet: 'Wala pa',
  signInWith: 'Pag-sign in gamit ang',
  signInEmail: (email) => `Iyong email, ${email}`,
  signInEmailOnly: 'Iyong email',
  signInUsername: (name) => `Iyong username, “${name}”`,
  profileTree: 'Puno',
  changeTree: 'Palitan',
  addUsernameTitle: 'Magdagdag ng username',
  addUsernameIntro:
    'Pumili ng username at iyon na ang gamitin sa pag-sign in mula ngayon, sa halip na ang iyong email. Hindi magbabago ang iyong password, puno at mga tala — ang email mo lang ang hindi na gagana sa pag-sign in.',
  adminKeepsEmail: 'Bilang admin, email pa rin ang gamit mo sa pag-sign in.',
  changeUsernameTitle: 'Palitan ang username',
  changeUsernameIntro:
    'Ang bagong username na ang gagamitin mo sa pag-sign in mula ngayon. Hindi na gagana agad ang luma, at puwede na itong kunin ng iba. Hindi magbabago ang iyong password, puno at mga tala.',
  newUsername: 'Bagong username',
  checkingName: 'Tinitingnan…',
  usernameFree: (name) => `✓ Puwede ang @${name}`,
  usernameIsYours: 'Iyan na ang username mo ngayon.',
  offlineRetry: 'Offline ka — kumonekta sa internet at subukan ulit.',
  pleaseWait: 'Sandali lang…',
  plantTree: 'Itanim ang aking puno',
  localTrial: 'Trial mode: sa browser na ito lang nakatago ang mga account hangga’t hindi pa konektado ang Supabase.',

  recoveryMenu: 'Recovery key',
  lockTitle: 'I-lock ang iyong mga tala',
  unlockTitle: 'Buksan ang iyong mga tala',
  onlyYou: 'ikaw lang ang makakabasa',
  lockIntro:
    'Ila-lock na ng Rooted ang bawat tala sa iyong device bago ito i-save, kaya ikaw lang ang makakabasa nito — hindi ang mga kaibigan mo, at hindi rin ang admin. Ilagay ang iyong password para i-on ito.',
  unlockIntro: 'Naka-lock ang iyong mga tala kaya ikaw lang ang makakabasa. Ilagay ang iyong password para mabuksan ang mga ito sa device na ito.',
  recoverIntro:
    'Ilagay ang recovery key na itinago mo at ang password na ginagamit mo ngayon sa pag-sign in. Mula noon, bubukas ang iyong mga tala gamit ang password na iyon.',
  unlockOffline: 'Hindi maabot ang server — kailangan mong mag-online para mabuksan ang mga tala.',
  recoveryKey: 'Recovery key',
  currentPassword: 'Iyong kasalukuyang password',
  useRecovery: 'Napalitan o na-reset ang password? Gamitin ang iyong recovery key',
  back: 'Bumalik',
  startOver: 'Nawala rin ang recovery key? Magsimula ulit',
  startOverConfirm:
    'Magsimula ulit gamit ang bagong key?\n\nMananatiling naka-lock habambuhay ang mga talang naisulat mo na — walang makakabukas sa mga ito, kahit ang admin. Gagamitin ng mga bagong tala ang bagong key.',
  enterPasswordFirst: 'Ilagay muna ang iyong kasalukuyang password.',
  unlocking: 'Binubuksan…',
  lockNotes: 'I-lock ang aking mga tala',
  unlock: 'Buksan',
  recoveryTitle: 'Ang iyong recovery key',
  recoveryWhy:
    'Kung makalimutan mo ang iyong password, nire-reset ito ng key na ito at nabubuksan muli ang iyong mga tala (Mag-sign in → Nakalimutan ang password?). Walang ibang may hawak nito — kahit ang admin.',
  recoveryKeep:
    'Itago ito sa ligtas na lugar: sa isang password manager, o isulat sa papel. Kapag nawala pareho ang password mo at ang key na ito, wala nang makakabukas sa iyong mga tala.',
  copy: 'Kopyahin',
  copied: 'Nakopya na',
  savedIt: 'Naitago ko na',
  newRecoveryIntro: 'Gumawa ng bagong recovery key. Hindi na gagana ang luma. Ilagay ang iyong password para magpatuloy.',
  making: 'Ginagawa…',
  makeNewKey: 'Gumawa ng bagong key',
  lockedNote: 'Naka-lock na tala',
  lockedNoteBody: 'Naka-lock ito gamit ang lumang key, kaya hindi na ito mabubuksan.',
  autoDatePrivate: 'Naka-lock para ikaw lang ang makabasa. Kusang nase-save ang petsa at oras.',

  installTitle: 'I-install ang Rooted',
  installIntro: 'Bubukas ang Rooted sa sarili nitong window mula sa iyong home screen o desktop, at mananatili kang naka-sign in.',
  installSteps: {
    ios: [
      <>
        Buksan ang page na ito sa <strong>Safari</strong>.
      </>,
      <>
        I-tap ang <strong>Share</strong> button (ang parisukat na may arrow na nakaturo pataas).
      </>,
      <>
        Mag-scroll pababa at i-tap ang <strong>Add to Home Screen</strong>, saka ang <strong>Add</strong>.
      </>,
      <>Buksan ang Rooted mula sa iyong Home Screen at mag-sign in nang isang beses — maaalala ka na nito mula noon.</>,
    ],
    android: [
      <>
        Buksan ang menu ng browser <strong>⋮</strong> (kanang itaas).
      </>,
      <>
        I-tap ang <strong>Install app</strong> (o <strong>Add to Home screen</strong>), saka ang <strong>Install</strong>.
      </>,
    ],
    desktop: [
      <>
        <strong>Chrome o Edge:</strong> i-click ang install icon sa dulong kanan ng address bar, o buksan ang menu <strong>⋮</strong> /{' '}
        <strong>…</strong> at piliin ang <strong>Install Rooted</strong> (Chrome: Cast, save and share → Install page as app; Edge: Apps →
        Install this site as an app).
      </>,
      <>
        <strong>Safari sa Mac:</strong> File → <strong>Add to Dock</strong>.
      </>,
      <>
        Hindi kayang i-install ng <strong>Firefox</strong> ang mga site bilang app — buksan ang Rooted sa Chrome o Edge para ma-install ito.
      </>,
    ],
  },

  tags: {
    Church: 'Simbahan',
    'Cell group': 'Cell group',
    Study: 'Pag-aaral',
    Prayer: 'Panalangin',
    Serving: 'Paglilingkod',
    Gratitude: 'Pasasalamat',
    Reflection: 'Pagninilay',
    Scripture: 'Kasulatan',
  },
  errors: {
    'Something went wrong.': 'May nangyaring mali.',
    'Not signed in': 'Hindi ka naka-sign in.',
    'Profile not found': 'Hindi nahanap ang profile.',
    'Admins only': 'Para sa mga admin lang.',
    'Could not save in this browser (storage is full or blocked).': 'Hindi ma-save sa browser na ito (puno o naka-block ang storage).',
    'No account with that username in this browser.': 'Walang account na may ganyang username sa browser na ito.',
    // usernames and password resets (src/lib/backend.ts, supabase/functions/account)
    'A username is 3–20 letters, numbers or _ (no spaces).': 'Ang username ay 3–20 letra, numero o _ (walang espasyo).',
    'That username is taken.': 'May gumagamit na ng username na iyan.',
    'Wrong username or password.': 'Mali ang username o password.',
    "That username and recovery key don't match.": 'Hindi magkatugma ang username at recovery key na iyan.',
    'Too many tries. Wait an hour, then try again.': 'Masyadong maraming subok. Maghintay ng isang oras, saka subukan ulit.',
    "This account's recovery key can't reset the password. Ask the admin to reset it.":
      'Hindi kayang i-reset ng recovery key ng account na ito ang password. Pakisabi sa admin na i-reset ito.',
    'The admin keeps signing in with email.': 'Email pa rin ang gamit ng admin sa pag-sign in.',
    'You already have a username.': 'May username ka na.',
    "That's already your username.": 'Iyan na ang username mo ngayon.',
    'Pick a username first.': 'Pumili muna ng username.',
    'Reset your own password from the Supabase dashboard.': 'I-reset ang sarili mong password mula sa Supabase dashboard.',
    'Usernames need the latest server update (supabase/functions/account and 20261120000000_usernames.sql) — ask the admin to set it up.':
      'Kailangan ng pinakabagong server update (supabase/functions/account at 20261120000000_usernames.sql) para sa mga username — pakisabi sa admin na i-set up ito.',
    'Profile icons need the latest database update (supabase/migrations/20261121000000_avatars.sql) — ask the admin to run it.':
      'Kailangan ng pinakabagong database update (supabase/migrations/20261121000000_avatars.sql) para sa mga icon — pakisabi sa admin na patakbuhin ito.',
    'Choosing a tree needs the latest database update (supabase/migrations) — ask the admin to run it.':
      'Kailangan ng pinakabagong database update (supabase/migrations) para makapili ng puno — pakisabi sa admin na patakbuhin ito.',
    "You're offline and this browser couldn't keep the note. Copy it somewhere safe and try again when you're online.":
      'Offline ka at hindi naitago ng browser na ito ang tala. Kopyahin ito sa ligtas na lugar at subukan ulit kapag online ka na.',
    'Request timed out': 'Natagalan ang request. Subukan ulit.',
    'A recovery key has 32 letters and numbers, like ABCD-EFGH-… — check it and try again.':
      'May 32 letra at numero ang recovery key, gaya ng ABCD-EFGH-… — suriin ito at subukan ulit.',
    'This account has no recovery key yet.': 'Wala pang recovery key ang account na ito.',
    "That recovery key doesn't match this account.": 'Hindi tugma ang recovery key na iyan sa account na ito.',
    'Private notes need the latest database update (supabase/migrations/20261118000000_private_notes.sql) — ask the admin to run it.':
      'Kailangan ng pinakabagong database update (supabase/migrations/20261118000000_private_notes.sql) para sa mga pribadong tala — pakisabi sa admin na patakbuhin ito.',
    "That password doesn't open your notes. If it was changed or reset, use your recovery key instead.":
      'Hindi nabubuksan ng password na iyan ang iyong mga tala. Kung napalitan o na-reset ito, gamitin na lang ang iyong recovery key.',
    "That isn't your password.": 'Hindi iyan ang iyong password.',
    'Your notes are locked on this device — unlock them with your password first.':
      'Naka-lock ang iyong mga tala sa device na ito — buksan muna ang mga ito gamit ang iyong password.',
    'This account has no note key yet — unlock with your password to set one up.':
      'Wala pang note key ang account na ito — buksan gamit ang iyong password para makagawa nito.',
    'Unlock your notes first.': 'Buksan muna ang iyong mga tala.',
    "That isn't the password your notes are locked with.": 'Hindi iyan ang password na ginamit sa pag-lock ng iyong mga tala.',
    'Trial mode keeps notes in this browser only.': 'Sa browser na ito lang nakatago ang mga tala sa trial mode.',
    'Too many notes in 24 hours. Try again later.': 'Masyadong maraming tala sa loob ng 24 oras. Subukan ulit mamaya.',
    // Supabase Auth
    'Invalid login credentials': 'Mali ang username o password.',
    'User already registered': 'May gumagamit na ng username na iyan.',
    'Email not confirmed': 'Hindi pa nakukumpirma ang email. Tingnan ang iyong inbox.',
    'Password should be at least 6 characters.': 'Dapat hindi bababa sa 6 na character ang password.',
    'Unable to validate email address: invalid format': 'Mali ang anyo ng email address.',
  },
};

const STRINGS: Record<Lang, Strings> = { en, tl };

// ---------- the chosen language ----------

const KEY = 'rooted.lang';

function stored(): Lang {
  try {
    return localStorage.getItem(KEY) === 'tl' ? 'tl' : 'en';
  } catch {
    return 'en';
  }
}

let current: Lang = stored();
const listeners = new Set<() => void>();
document.documentElement.lang = current;

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // private mode or blocked storage: the choice lasts until the page closes
  }
  listeners.forEach((f) => f());
}

const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
const snapshot = () => current;

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** The text for the chosen language; re-renders when it changes. */
export function useT(): Strings {
  return STRINGS[useLang()];
}

/** The text for the chosen language right now, for callbacks outside render. */
export const strings = (): Strings => STRINGS[current];

/** A stored English tag, in the chosen language. */
export const tagName = (t: Strings, tag: string) => t.tags[tag] ?? tag;

// What browsers say when a request can't reach the server at all.
const NO_CONNECTION = /failed to fetch|load failed|networkerror|network request failed|fetch failed|err_internet_disconnected/i;

/** An error message, in the chosen language when we know it. */
export const errorText = (t: Strings, msg: string) => t.errors[msg] ?? (NO_CONNECTION.test(msg) ? t.offlineRetry : msg);
