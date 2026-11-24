// Profile icons: little hand-drawn pixel pictures to choose from in My profile.
// Each is 16 × 16. A letter is a colour from that icon's palette, '.' is empty. Light comes
// from the top left: every icon is drawn with its own highlight and shadow, and gets a dark
// outline in a deeper shade of the colour it touches (so a red shoe has a dark red edge).

export type AvatarId = (typeof AVATARS)[number]['id'];

interface Art {
  id: string;
  rows: string[];
  pal: Record<string, string>;
}

export const AVATARS = [
  {
    id: 'bottle',
    pal: { c: '#c98d58', C: '#8e5a34', w: '#e8c08a', g: '#45b06e', G: '#24794c', h: '#c9f7d4', l: '#f4e8c8', L: '#c9b483', t: '#8e5a34' },
    rows: [
      '................',
      '......wccC......',
      '......CCCC......',
      '.......hgG......',
      '.......hgG......',
      '......hggGG.....',
      '.....hgggggG....',
      '....ghgggggGG...',
      '....lllllllLL...',
      '....ltttttlLL...',
      '....lllllllLL...',
      '....ghgggggGG...',
      '....ghgggggGG...',
      '....gggggggGG...',
      '.....GGGGGGG....',
      '................',
    ],
  },
  {
    id: 'ball',
    pal: { h: '#ffffff', w: '#e9edf3', s: '#b9c1cf', k: '#2b2e3d', K: '#4a4f66' },
    rows: [
      '................',
      '................',
      '......wkkw......',
      '....whwkkwws....',
      '...whwwwwwwws...',
      '...hwwwkkwwws...',
      '..kwwwkkkkwwsk..',
      '..kkwwkkkkwskk..',
      '..kwwwwkkwwssk..',
      '..wwwwwwwwwsss..',
      '...wKKwwwsKKs...',
      '...wKKwwssKKs...',
      '....swwsssss....',
      '......ssss......',
      '................',
      '................',
    ],
  },
  {
    id: 'crown',
    pal: { p: '#fff6dc', h: '#fff1a6', y: '#f4c232', Y: '#c98a14', d: '#9a6510', r: '#e0364f', b: '#3d6fe6', e: '#2fb85c' },
    rows: [
      '................',
      '................',
      '..p....pp....p..',
      '..y....yy....y..',
      '..yy..hyyY..yY..',
      '..hyy.hyyY.yyY..',
      '..hyyyhyyYyyyY..',
      '..hyyyyyyyyyyY..',
      '..hyyyyyyyyyyY..',
      '..YYYYYYYYYYYY..',
      '..hyrryybbyeeY..',
      '..hyrryybbyeeY..',
      '..dddddddddddd..',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'book',
    pal: { h: '#c4545e', c: '#94303c', C: '#62202a', g: '#f4c64a', G: '#c08a1c', p: '#f6eed8', P: '#cfc09c', r: '#f4c64a' },
    rows: [
      '................',
      '................',
      '...hccccccccC...',
      '...hccccccccCp..',
      '...hccccgcccCp..',
      '...hccccgcccCp..',
      '...hccgggggcCp..',
      '...hccccgcccCp..',
      '...hccccgcccCp..',
      '...hccccgcccCp..',
      '...hccccccccCp..',
      '...hccccccccCP..',
      '...CppppppppPP..',
      '....CCCCCrCCCC..',
      '.........r......',
      '................',
    ],
  },
  {
    id: 'bread',
    pal: { h: '#f6c27a', b: '#de8c3e', B: '#ad5c24', s: '#fbe2b0', d: '#83421a' },
    rows: [
      '................',
      '................',
      '................',
      '.....hhhhhh.....',
      '...hhhhhhhhhb...',
      '..hhsbhhsbhhsb..',
      '.hhhhsbhhsbhhsb.',
      '.hhbbbbbbbbbbbB.',
      '.hbbbbbbbbbbbbB.',
      '.hbbbbbbbbbbbBB.',
      '.bbbbbbbbbbbBBB.',
      '..BBBBBBBBBBBB..',
      '...dddddddddd...',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'shoes',
    pal: { h: '#ff8c80', r: '#e2474b', R: '#a82a3a', w: '#f6f6f6', W: '#c3c8d2', l: '#ffffff', g: '#7d8496' },
    rows: [
      '................',
      '................',
      '................',
      '..rrr...........',
      '..hrrr..........',
      '..hrrRl.........',
      '..hrrrrl........',
      '..hrrRlrl.......',
      '..hrrrrlrlr.....',
      '..rrrrrrrrrhh...',
      '..rrrrrrrrrrrrh.',
      '..RRRRRRRRRRRRR.',
      '..wwwwwwwwwwwww.',
      '..WgWgWgWgWgWWW.',
      '................',
      '................',
    ],
  },
  {
    id: 'dove',
    pal: { w: '#ffffff', s: '#d6dcea', S: '#a9b2c8', o: '#f2a33a', e: '#2b2e3d', g: '#5fb85a', G: '#3a8a3e' },
    rows: [
      '................',
      '................',
      '..........ww....',
      '.........wwew...',
      '.........wwwwoo.',
      '...ss....wwws...',
      '..wwsS..wwwws...',
      '.wwwwsSswwwws...',
      '..wwwwwwwwwws...',
      '...wwwwwwwwsgg..',
      '....Swwwwwssg...',
      '.....SSSSSS.G...',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'fish',
    pal: { h: '#9fe2ff', b: '#3aa0e6', B: '#2266b0', f: '#2a7fcc', w: '#ffffff', e: '#1b2238', s: '#c9f0ff' },
    rows: [
      '................',
      '................',
      '................',
      '.......BB.......',
      '......hbbB......',
      '.B...hbbbbbB....',
      '.BB.hbbbbbbbbB..',
      '.BBbbbsbsbbweb..',
      '..Bbbbsbsbbbbbb.',
      '.BBbbbbbbbbbbbB.',
      '.BB.bbbbbbbbBB..',
      '.B...BbbbbBB....',
      '.......BB.......',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'sheep',
    pal: { w: '#ffffff', s: '#dfe2ec', S: '#b4bacb', f: '#3a3340', F: '#5b5262', e: '#ffffff', p: '#f2a0a8' },
    rows: [
      '................',
      '................',
      '................',
      '....wwww.ww.....',
      '..wwwwwwwwwww...',
      '.wwwwwwwwwwwws..',
      '.wwwwwwwwwwwffF.',
      '.swwwwwwwwwwfefF',
      '.swwwwwwwwwwffff',
      '.sswwwwwwwwsfpf.',
      '..sssssssssS.F..',
      '...ff.ff.ff.ff..',
      '...ff.ff.ff.ff..',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'mug',
    pal: { s: '#f4f4f4', m: '#4c8de0', M: '#2f5fa8', h: '#94c2ff', c: '#7a4426', C: '#a8683a', v: '#ffffff', w: '#e0e6f0' },
    rows: [
      '................',
      '.....v..v.......',
      '......v..v......',
      '.....v..v.......',
      '................',
      '...hmmmmmmmM....',
      '...hCcccccCM....',
      '...hmmmmmmmMMM..',
      '...hmmmmmmmM.M..',
      '...hmmwmmmmM.M..',
      '...hmmmmmmmMMM..',
      '...hmmmmmmmM....',
      '....MMMMMMM.....',
      '..wwwwwwwwwww...',
      '................',
      '................',
    ],
  },
  {
    id: 'star',
    pal: { h: '#fff6b0', y: '#ffd23c', Y: '#e09a14', d: '#b06c0c' },
    rows: [
      '................',
      '.......hy.......',
      '......hyyY......',
      '......hyyY......',
      '.....hyyyyY.....',
      '.hhhhhyyyyYYYYY.',
      '..hyyyyyyyyyyY..',
      '...hyyyyyyyyY...',
      '....hyyyyyyY....',
      '....hyyyyyyY....',
      '...hyyyyyyyyY...',
      '...hyyY..hyyY...',
      '..hyyY....hyyY..',
      '..hY........YY..',
      '................',
      '................',
    ],
  },
  {
    id: 'heart',
    pal: { h: '#ffb0b8', w: '#ffffff', r: '#ee3e57', R: '#b52342', d: '#86183a' },
    rows: [
      '................',
      '................',
      '...rrrr..rrrr...',
      '..rwhrrrrrrrrR..',
      '.rwhrrrrrrrrrrR.',
      '.rhrrrrrrrrrrrR.',
      '.rrrrrrrrrrrrrR.',
      '.rrrrrrrrrrrrRR.',
      '..rrrrrrrrrrRR..',
      '...rrrrrrrrRR...',
      '....rrrrrrRR....',
      '.....rrrrRR.....',
      '......rRRd......',
      '.......dd.......',
      '................',
      '................',
    ],
  },
  {
    id: 'sunflower',
    pal: { h: '#ffe680', y: '#ffc21c', Y: '#e08a10', c: '#7a4a24', C: '#4e2e18', d: '#9c6a3a', g: '#4fae4a', G: '#2f7d34' },
    rows: [
      '................',
      '.....hy.hy......',
      '...hyyhyyhyyY...',
      '...yycCCCcyY....',
      '..hycdcdcdcCyY..',
      '..yycdcdcdCCyY..',
      '..hycCdcdCCCYY..',
      '...yycCCCCCyY...',
      '...hyYyyYyyY....',
      '.....Yy.YY......',
      '.......g........',
      '....gg.gG.......',
      '....gGggG.......',
      '......gG........',
      '.......g........',
      '................',
    ],
  },
  {
    id: 'apple',
    pal: { h: '#ff9a8c', w: '#ffffff', r: '#e23a3a', R: '#a8202e', s: '#6a3a1e', g: '#5fc24e', G: '#2f8a34' },
    rows: [
      '................',
      '.........gg.....',
      '.......s.ggG....',
      '........s.G.....',
      '...rrrr.srrr....',
      '..rwhrrrrrrrR...',
      '.rwhrrrrrrrrRR..',
      '.rhrrrrrrrrrRR..',
      '.rhrrrrrrrrrRR..',
      '.rrrrrrrrrrrRR..',
      '.rrrrrrrrrrRRR..',
      '..rrrrrrrrRRR...',
      '..rrrrRRRRRR....',
      '....RR..RR......',
      '................',
      '................',
    ],
  },
  {
    id: 'guitar',
    pal: { h: '#f6c27a', b: '#d9873a', B: '#a35a24', n: '#6a3a1e', N: '#4a2814', k: '#2b2230', s: '#f2f2f2', p: '#f4d9a8' },
    rows: [
      '................',
      '......NNNN......',
      '.....pNnnNp.....',
      '.......nN.......',
      '.......nN.......',
      '.......nN.......',
      '....hbbnNbbB....',
      '...hbbbnNbbbB...',
      '...hbbbnNbbbB...',
      '....hbbbbbbB....',
      '...hbbbkkbbbB...',
      '..hbbbkkkkbbbB..',
      '..hbbbbkkbbbbB..',
      '...BbBBBBBBbB...',
      '....BBBBBBBB....',
      '................',
    ],
  },
  {
    id: 'cat',
    pal: { o: '#f2a34a', O: '#c2702a', h: '#ffd08a', s: '#fff2dc', p: '#f49aa8', e: '#2b2e3d', g: '#7fdc6a' },
    rows: [
      '................',
      '................',
      '...o.......o....',
      '...oo.....oO....',
      '...opo...opO....',
      '...hoooooooO....',
      '..hoooooooooO...',
      '..hoegoooegoO...',
      '..hoeeoooeeoO...',
      '..hossspssssoO..',
      '...hsssssssoO...',
      '....OoooooOO....',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'note',
    pal: { h: '#b48cff', v: '#7c4fe0', V: '#4e2aa8' },
    rows: [
      '................',
      '.......hvvvvvvV.',
      '.......hvvvvvvV.',
      '.......hVVVVvvV.',
      '.......h.....vV.',
      '.......h.....vV.',
      '.......h.....vV.',
      '.......h.....vV.',
      '.......h..hvvvV.',
      '.......h.hvvvvV.',
      '...hvvvV.hvvvVV.',
      '..hvvvvV..VVVV..',
      '..hvvvVV........',
      '...VVVV.........',
      '................',
      '................',
    ],
  },
  {
    id: 'mushroom',
    pal: { h: '#ff8c80', r: '#e2403e', R: '#a8242e', w: '#ffffff', s: '#f3e6cc', S: '#c9b48a' },
    rows: [
      '................',
      '................',
      '.....hhrrr......',
      '...hhwwrrrrR....',
      '..hrwwwrrrwwR...',
      '..hrrwrrrrwwRR..',
      '.hwwrrrrrrrrRR..',
      '.hwwwrrrwwrrRRR.',
      '.rrrrrrrwwrRRRR.',
      '..SSSSSSSSSSSS..',
      '.....ssssSS.....',
      '.....sssssS.....',
      '.....sssssS.....',
      '....sssssSSS....',
      '................',
      '................',
    ],
  },
  {
    id: 'rocket',
    pal: { h: '#ffffff', w: '#e6eaf2', s: '#b4bccd', r: '#e2474b', R: '#a82a3a', b: '#5ec8f2', B: '#2a86c8', y: '#ffd23c', o: '#ff8a2a' },
    rows: [
      '................',
      '.......rR.......',
      '......rrRR......',
      '.....rrrRRR.....',
      '.....hwwwws.....',
      '.....hwbbws.....',
      '.....hwBBws.....',
      '.....hwwwws.....',
      '.....hwwwws.....',
      '....rhwwwwsR....',
      '...rrhwwwwsRR...',
      '...rR.ssss.RR...',
      '......oyyo......',
      '.......oo.......',
      '................',
      '................',
    ],
  },
  {
    id: 'cake',
    pal: { w: '#ffffff', p: '#f9b7c8', P: '#e07f9a', c: '#f6dfb4', C: '#d2a96e', f: '#ffd23c', F: '#ff8a2a', k: '#f4f6fa', r: '#e2404e' },
    rows: [
      '................',
      '.......f........',
      '......fF........',
      '.......k........',
      '.......k........',
      '...wwwwwwwwww...',
      '..wwpwwwrwwpwP..',
      '..pPpPpPpPpPpP..',
      '..cccccccccccC..',
      '..cccccccccccC..',
      '..pppppppppppP..',
      '..cccccccccccC..',
      '..cccccccccccC..',
      '..CCCCCCCCCCCC..',
      '.wwwwwwwwwwwwww.',
      '................',
    ],
  },
  {
    id: 'coolcat',
    pal: { o: '#f2a34a', O: '#c2702a', h: '#ffd08a', s: '#fff2dc', p: '#f49aa8', e: '#2b2e3d', g: '#7fdc6a', k: '#1d1b26', w: '#9fd8ff', m: '#c2702a' },
    rows: [
      '................',
      '................',
      '...o.......o....',
      '...oo.....oO....',
      '...opo...opO....',
      '...hoooooooO....',
      '..hoooooooooO...',
      '..hkwkkkkwkkO...',
      '..hokkkokkkoO...',
      '..hossspssssoO..',
      '...hsssmmssoO...',
      '....OoooooOO....',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'djcat',
    pal: { o: '#f2a34a', O: '#c2702a', h: '#ffd08a', s: '#fff2dc', p: '#f49aa8', e: '#2b2e3d', g: '#7fdc6a', b: '#3a3348', c: '#e2474b', C: '#ff8a80', d: '#a82a3a' },
    rows: [
      '................',
      '....bbbbbbbb....',
      '...b........b...',
      '..b.o......o.b..',
      '..b.oo....oO.b..',
      '..b.hpooooOO.b..',
      '.CchooooooooOcd.',
      '.CchoegooegoOcd.',
      '.CchoeeooeeoOcd.',
      '.dchsssppsssOcd.',
      '....hssssssO....',
      '.....OooooO.....',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'tree',
    pal: { h: '#9be36a', g: '#4fb44a', G: '#2f7d34', d: '#1f5a2a', r: '#ee4454', t: '#8a5a32', T: '#5e3a1e', m: '#6fc25a' },
    rows: [
      '................',
      '......hggg......',
      '....hhgggggG....',
      '...hhggrgggGG...',
      '..hhggggggGGGG..',
      '..hgggggggrGGG..',
      '..hgrgggggGGGd..',
      '..gggggggGGGdd..',
      '...gggGGGGGdd...',
      '....GGGGGddd....',
      '.......tT.......',
      '.......tT.......',
      '......ttTT......',
      '....mmmmmmmm....',
      '................',
      '................',
    ],
  },
  {
    id: 'snowman',
    pal: { w: '#ffffff', s: '#d3dbea', S: '#a7b3c9', k: '#2b2e3d', K: '#4a5068', r: '#e2404e', R: '#a8242e', o: '#ff8a2a', t: '#8a5a32' },
    rows: [
      '................',
      '......kkkk......',
      '......rrrR......',
      '.....kkkkkK.....',
      '.....wwwwws.....',
      '.....wkwwks.....',
      '.....wwoooo.....',
      '......wwss......',
      '....rrrrrrrR....',
      '.t.wwwwwwwRrs.t.',
      '..twwwwkwwRwst..',
      '..wwwwwwwwwwss..',
      '..wwwwwkwwwwss..',
      '...swwwwwwwss...',
      '....SSSSSSSS....',
      '................',
    ],
  },
  {
    id: 'cap',
    pal: { h: '#8ab8ff', b: '#3f7fe0', B: '#2a55a8', v: '#3468c4', V: '#1f3f80', w: '#ffffff', y: '#ffd23c' },
    rows: [
      '................',
      '................',
      '................',
      '......bb........',
      '....hbbbbB......',
      '...hbbbbbbB.....',
      '..hbbbbwbbbB....',
      '..hbbbwywbbB....',
      '..hbbbbwbbbBvv..',
      '..hbbbbbbbbvvvv.',
      '..BBBBBBBBBVVVV.',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'frog',
    pal: { h: '#a6ec7a', g: '#5cc04a', G: '#358a34', w: '#ffffff', k: '#1d1b26', p: '#ff9aa8', m: '#2a5e2a' },
    rows: [
      '................',
      '................',
      '................',
      '..hggG....hggG..',
      '..gwkg....gwkg..',
      '..gwwgggggwwgG..',
      '.hgggggggggggGG.',
      '.hgpggggggggpGG.',
      '.hggmggggggmgGG.',
      '..hggmmmmmmgGG..',
      '...GGGGGGGGGG...',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'owl',
    pal: { h: '#c08a5a', b: '#8e5a34', B: '#5e3a1e', c: '#f0d6a8', v: '#c9a874', w: '#ffffff', y: '#ffb42a', k: '#1d1b26', o: '#f28a2a' },
    rows: [
      '................',
      '...b........b...',
      '...bb......bb...',
      '...hbbbbbbbbB...',
      '..hbwwwbbwwwbB..',
      '..hwyykbbkyywB..',
      '..hwykkbbkkywB..',
      '..hbwwwoowwwbB..',
      '..hbbccoocccbB..',
      '..hbcvccvccvbB..',
      '...bccvccvccB...',
      '...hbcccccbB....',
      '....BBBBBBB.....',
      '.....yy..yy.....',
      '................',
      '................',
    ],
  },
  {
    id: 'penguin',
    pal: { k: '#2b2e3d', h: '#4f5672', w: '#ffffff', s: '#d3dbea', e: '#1d1b26', y: '#ffb42a', o: '#ff8a2a', p: '#ffb0bc' },
    rows: [
      '................',
      '......kkkk......',
      '.....hkkkkk.....',
      '....hkwwwwkk....',
      '....hwewwewk....',
      '....hpwyywpk....',
      '...hkwwwwwwkk...',
      '..hkkwwwwwwkkk..',
      '..hk.wwwwwws.k..',
      '..h..wwwwwws..k.',
      '....hwwwwwwsk...',
      '....kkssssskk...',
      '....oo....oo....',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'bunny',
    pal: { w: '#ffffff', s: '#d6dcea', S: '#a9b2c8', p: '#f49aa8', k: '#2b2e3d' },
    rows: [
      '....ww....ww....',
      '....wpw..wps....',
      '....wpw..wps....',
      '....wpw..wps....',
      '....wpws.wps....',
      '...wwwwwwwwws...',
      '..wwwwwwwwwwws..',
      '..wwwkwwwwkwws..',
      '..wpwwwppwwwps..',
      '..wwwwwkwwwwss..',
      '...swwwwwwwss...',
      '....SSSSSSSS....',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'dog',
    pal: { h: '#f6d29a', t: '#e8b46a', T: '#c08440', b: '#8a5a32', B: '#5e3a1e', k: '#1d1b26', w: '#ffffff', p: '#f46a7a' },
    rows: [
      '................',
      '................',
      '.....htttttT....',
      '...bbhttttttbb..',
      '..bbbhtttttTbbb.',
      '..bbbhkttktTbbb.',
      '..bbbhtwwttTbbb.',
      '..bb.hwwkkwT.bb.',
      '..b..hwwwwwT..b.',
      '......TwppT.....',
      '.......Tpp......',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'bear',
    pal: { h: '#c08a5a', b: '#9a6438', B: '#6a4022', p: '#f49aa8', k: '#1d1b26', m: '#f0d6a8', M: '#d2b07a' },
    rows: [
      '................',
      '................',
      '...bb......bb...',
      '..bpbb....bbpB..',
      '..bbbbbbbbbbbB..',
      '..hbbbbbbbbbbB..',
      '..hbkbbbbbbkbB..',
      '..hbbbmmmmbbbB..',
      '..hbbmmkkmmbbB..',
      '..hbbmmmMmmbbB..',
      '...bbbmmmmbbB...',
      '....BBBBBBBB....',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'donut',
    pal: { h: '#ffc6d6', p: '#f58cab', P: '#c85a80', c: '#eab06a', d: '#b87a3a', y: '#ffe14a', b: '#4aa8ff', g: '#5fd06a', w: '#ffffff' },
    rows: [
      '................',
      '................',
      '................',
      '.....hhpppp.....',
      '...hhppypppbP...',
      '..hpbppwppgppP..',
      '..hpgpp..pypbP..',
      '..cppy....pppd..',
      '..cpwp....pbpd..',
      '..ccppp..pppdd..',
      '..cccpppppdddd..',
      '...ccccccdddd...',
      '.....dddddd.....',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'icecream',
    pal: { r: '#ee3448', R: '#a8202e', h: '#ffd0dc', p: '#f7a0b8', P: '#d06a8a', m: '#9ee8c4', M: '#4fb88a', n: '#d4fff0', c: '#f0b86a', C: '#c48236' },
    rows: [
      '.......r........',
      '......rR........',
      '......hppP......',
      '.....hppppP.....',
      '.....hppppP.....',
      '....nmmmmmmM....',
      '...nmmmmmmmmM...',
      '...mMmMMmMmMM...',
      '....cCcCcCcC....',
      '....CcCcCcCc....',
      '.....cCcCcC.....',
      '.....CcCcCc.....',
      '......cCcC......',
      '.......cC.......',
      '................',
      '................',
    ],
  },
  {
    id: 'watermelon',
    pal: { h: '#ff8a96', r: '#f0405a', R: '#c02842', k: '#2b2230', w: '#f4fff0', g: '#4fb44a', G: '#2f7d34' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '.ghhhhhhhhhhhhg.',
      '.gwrrkrrrrkrrwG.',
      '..gwrrrrkrrrwG..',
      '..gwrkrrrrkRwG..',
      '...gwrrrrRRwG...',
      '....gwwRRwwG....',
      '.....gGGGGG.....',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'cactus',
    pal: { f: '#ff7ab0', F: '#c84a80', h: '#9be36a', g: '#4fb44a', G: '#2f7d34', w: '#f4ffe8', t: '#f0a06a', p: '#d9773e', P: '#a8522a' },
    rows: [
      '................',
      '.......fF.......',
      '......hggG......',
      '......hgwG.hG...',
      '......hggG.hG...',
      '..hG..hggGhgG...',
      '..hG..hgggGG....',
      '..hgggggwgG.....',
      '......hggG......',
      '......hgwG......',
      '...tttttttttt...',
      '....ppppppppP...',
      '....ppppppppP...',
      '.....PPPPPPP....',
      '................',
      '................',
    ],
  },
  {
    id: 'moon',
    pal: { h: '#fff6c8', y: '#ffe27a', Y: '#e0a830', s: '#ffffff', S: '#bfe0ff' },
    rows: [
      '................',
      '......hyyy......',
      '....hyyyY.......',
      '...hyyyY....s...',
      '..hyyyY....sSs..',
      '..hyyY......s...',
      '..hyyY..........',
      '..hyyY.....S....',
      '..hyyyY.........',
      '...hyyyY........',
      '...hyyyyyY...s..',
      '....YyyyyyyY....',
      '......YYYYY.....',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'rainbow',
    pal: { r: '#ee4454', o: '#ff9a2a', y: '#ffe14a', g: '#5fd06a', b: '#4aa8ff', w: '#ffffff', h: '#ffffff', s: '#d6e2f2' },
    rows: [
      '................',
      '................',
      '................',
      '......rrrr......',
      '....rroooorr....',
      '...rooyyyyoor...',
      '..royyggggyyor..',
      '..roygbbbbgyor..',
      '..roygb..bgyor..',
      '..roygb..bgyor..',
      '..hww......hww..',
      '.hwwws....hwwws.',
      '.ssssss..ssssss.',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'umbrella',
    pal: { h: '#ff8c80', r: '#e2474b', R: '#a82a3a', w: '#ffffff', W: '#d6dcea', k: '#4a4258' },
    rows: [
      '................',
      '.......k........',
      '.....hrwwrR.....',
      '...hrrrwwrrrR...',
      '..hrrrrwwrrrrR..',
      '.hrrrrrwwrrrrRR.',
      '.rrrrrrWWrrrrRR.',
      '.R.RR.RkWR.RR.R.',
      '.......k........',
      '.......k........',
      '.......k........',
      '.......k........',
      '....k..k........',
      '.....kk.........',
      '................',
      '................',
    ],
  },
  {
    id: 'balloon',
    pal: { h: '#ff8c80', r: '#e2474b', R: '#a82a3a', y: '#ffe14a', Y: '#e0a020', k: '#5e3a1e', b: '#c98a52', B: '#8e5a34' },
    rows: [
      '......ryyr......',
      '....rryyyyrr....',
      '...hrryyyyrrR...',
      '..hrrryyyyrrrR..',
      '..hrrryyyyrrrR..',
      '..hrrryyyyrrrR..',
      '...rrryyyyrrR...',
      '....rryyyyrR....',
      '.....RYYYYR.....',
      '.....k....k.....',
      '......k..k......',
      '......bbbB......',
      '......BBBB......',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'gamepad',
    pal: { h: '#a6a2c8', g: '#6c6894', G: '#45416a', k: '#24203a', r: '#ee4454', b: '#4aa8ff', y: '#ffe14a', e: '#5fd06a' },
    rows: [
      '................',
      '................',
      '................',
      '................',
      '...hggggggggG...',
      '..hggkggggyggG..',
      '.hggkkkggbgeggG.',
      '.hgggkggggrgggG.',
      '.hggggggggggggG.',
      '.hgggGGGGGGgggG.',
      '..GGG......GGG..',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  {
    id: 'church',
    pal: { y: '#ffd23c', r: '#d8404a', R: '#9a2834', h: '#ff8a80', w: '#fff8ec', W: '#d8ccb4', b: '#6cc4f0', k: '#5e3a1e', g: '#5fc24e', G: '#3a8a3e' },
    rows: [
      '.......y........',
      '......yyy.......',
      '.......y........',
      '.......r........',
      '......hrR.......',
      '.....hrrRR......',
      '......wbW.......',
      '......wwW.......',
      '..hrrrrrrrrrR...',
      '..wwwwwwwwwwW...',
      '..wbwwwkwwwbW...',
      '..wbwwkkkwwbW...',
      '..wwwwkkkwwwW...',
      '.ggggggggggggG..',
      '................',
      '................',
    ],
  },
] as const satisfies readonly Art[];


export const AVATAR_IDS = AVATARS.map((a) => a.id) as AvatarId[];

export const isAvatar = (id: unknown): id is AvatarId => typeof id === 'string' && (AVATAR_IDS as string[]).includes(id);

// ---------------- backgrounds ----------------

/** The coloured tiles an icon (or the first letter of a name) can sit on. */
export const BACKDROPS = {
  sky: '#8fcff5',
  rose: '#f5a3b5',
  mint: '#93dfb4',
  lemon: '#f8e27a',
  lilac: '#c3aef2',
  peach: '#f8bb8c',
  cream: '#f4ecd6',
  navy: '#3d4a8a',
  night: '#2a2142',
  berry: '#b8406a',
  forest: '#2f7d4a',
} as const;

/** 'clear': no tile, just the picture. */
export type BackdropId = keyof typeof BACKDROPS | 'clear';
export const BACKDROP_IDS = [...Object.keys(BACKDROPS), 'clear'] as BackdropId[];
const isBackdrop = (id: unknown): id is BackdropId => typeof id === 'string' && (BACKDROP_IDS as string[]).includes(id);

/** Each icon's own colour, used until someone picks one: chosen so the picture stands out. */
const OWN: Record<AvatarId, BackdropId> = {
  bottle: 'peach', ball: 'forest', crown: 'berry', book: 'cream', bread: 'sky', shoes: 'lemon', dove: 'sky', fish: 'peach',
  sheep: 'mint', mug: 'peach', star: 'night', heart: 'cream', sunflower: 'sky', apple: 'mint', guitar: 'lilac', cat: 'lilac',
  note: 'lemon', mushroom: 'forest', rocket: 'night', cake: 'rose', coolcat: 'sky', djcat: 'navy', tree: 'sky', snowman: 'navy',
  cap: 'lemon', frog: 'rose', owl: 'sky', penguin: 'sky', bunny: 'mint', dog: 'lilac', bear: 'lemon', donut: 'mint',
  icecream: 'lilac', watermelon: 'cream', cactus: 'lemon', moon: 'night', rainbow: 'sky', umbrella: 'navy', balloon: 'sky',
  gamepad: 'peach', church: 'sky',
};

/**
 * What someone chose. Saved as one short word or two: "crown" (the crown on its own colour),
 * "crown.navy" (on navy), "letter.mint" (the first letter of their name, on mint). null: nothing yet.
 * `bg` null: the icon's own colour.
 */
export interface AvatarChoice {
  icon: AvatarId | null;
  bg: BackdropId | null;
}

const LETTER = 'letter';

export function parseAvatar(value: string | null | undefined): AvatarChoice {
  const [icon, bg] = (value ?? '').split('.');
  return { icon: isAvatar(icon) ? icon : null, bg: isBackdrop(bg) ? bg : null };
}

export function avatarValue({ icon, bg }: AvatarChoice): string | null {
  if (!icon && !bg) return null;
  return bg ? `${icon ?? LETTER}.${bg}` : icon;
}

/** Whether a saved value is one this app wrote (so the database never gets anything else). */
export const isAvatarValue = (v: unknown): v is string => typeof v === 'string' && avatarValue(parseAvatar(v)) === v;

/** The tile colour actually shown; null for the letter on the app's own accent colour. */
export function backdropOf({ icon, bg }: AvatarChoice): BackdropId | null {
  return bg ?? (icon ? OWN[icon] : null);
}

// ---------------- drawing ----------------

/** One horizontal run of same-coloured pixels. */
export interface Run {
  x: number;
  y: number;
  w: number;
  c: string;
}

const ART = 16; // the drawings
export const TILE = 18; // the drawing plus a one-pixel frame, so it never touches the tile's edge

function rgb(color: string) {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
export const shade = (color: string, f: number) => toHex(rgb(color).map((v) => v * f));
export const lighten = (color: string, f: number) => toHex(rgb(color).map((v) => v + (255 - v) * f));
export const luminance = (color: string) => {
  const [r, g, b] = rgb(color);
  return r * 0.3 + g * 0.59 + b * 0.11;
};

/**
 * A pixel tile: rounded off by one pixel at each corner, a dark frame in a deeper shade of
 * its own colour, lit along the top and left and shaded along the bottom and right.
 */
function tile(bg: string): (string | null)[] {
  const px: (string | null)[] = Array(TILE * TILE).fill(null);
  const frame = shade(bg, 0.42), light = lighten(bg, 0.38), dark = shade(bg, 0.82);
  const last = TILE - 1;
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const edgeX = x === 0 || x === last, edgeY = y === 0 || y === last;
      if (edgeX && edgeY) continue; // the corners are cut
      const inCorner = (x === 1 || x === last - 1) && (y === 1 || y === last - 1);
      px[y * TILE + x] = edgeX || edgeY || inCorner ? frame : y === 1 || x === 1 ? light : y === last - 1 || x === last - 1 ? dark : bg;
    }
  return px;
}

function runsOf(px: (string | null)[]): Run[] {
  const runs: Run[] = [];
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; ) {
      const c = px[y * TILE + x];
      let w = 1;
      while (c && x + w < TILE && px[y * TILE + x + w] === c) w++;
      if (c) runs.push({ x, y, w, c });
      x += w;
    }
  return runs;
}

const cache = new Map<string, Run[]>();

/**
 * The picture on its tile, as runs on an 18 × 18 grid (few enough to draw as SVG rectangles).
 * `icon` null: just the tile (the letter is drawn over it). `bg` null or 'clear': no tile.
 */
export function avatarRuns(icon: AvatarId | null, bg: BackdropId | null): Run[] {
  const key = `${icon}.${bg}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const px = bg && bg !== 'clear' ? tile(BACKDROPS[bg]) : Array<string | null>(TILE * TILE).fill(null);
  if (icon) {
    const art = AVATARS.find((a) => a.id === icon)!;
    const pal = art.pal as Record<string, string>;
    const pic = (x: number, y: number): string | null =>
      x < 0 || y < 0 || x >= ART || y >= ART ? null : (pal[art.rows[y][x]] ?? null);
    for (let y = -1; y <= ART; y++)
      for (let x = -1; x <= ART; x++) {
        const i = (y + 1) * TILE + (x + 1);
        const c = pic(x, y);
        if (c) {
          px[i] = c;
          continue;
        }
        // outline: an empty pixel next to the picture takes a deep shade of the darkest colour
        // it touches, so edges look crisp and stay in the icon's own hue on any tile
        const near = [pic(x - 1, y), pic(x + 1, y), pic(x, y - 1), pic(x, y + 1)].filter((n): n is string => !!n);
        if (near.length) px[i] = shade(near.reduce((a, b) => (luminance(b) < luminance(a) ? b : a)), 0.42);
      }
  }
  const runs = runsOf(px);
  cache.set(key, runs);
  return runs;
}
