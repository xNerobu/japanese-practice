export interface ThemeWord {
  word: string; // kanji if common
  kana: string;
  romaji: string;
  meaning: string; // Traditional Chinese
}

export interface Song {
  id: string;
  title: string;
  titleKana: string;
  titleRomaji: string;
  artist: string;
  anime?: string; // anime or film title
  description: string; // Traditional Chinese
  themeWords: ThemeWord[];
}

export const songsData: Song[] = [
  {
    id: 'idol',
    title: 'アイドル',
    titleKana: 'アイドル',
    titleRomaji: 'aidoru',
    artist: 'YOASOBI',
    anime: '【推しの子】',
    description: '充滿活力的動畫主題曲，以偶像文化為主題，旋律明快動感。',
    themeWords: [
      { word: '光', kana: 'ひかり', romaji: 'hikari', meaning: '光' },
      { word: '夢', kana: 'ゆめ', romaji: 'yume', meaning: '夢' },
      { word: '心', kana: 'こころ', romaji: 'kokoro', meaning: '心' },
      { word: '星', kana: 'ほし', romaji: 'hoshi', meaning: '星星' },
      { word: '愛', kana: 'あい', romaji: 'ai', meaning: '愛' },
      { word: '今', kana: 'いま', romaji: 'ima', meaning: '現在' },
    ],
  },
  {
    id: 'yoru-ni-kakeru',
    title: '夜に駆ける',
    titleKana: 'よるにかける',
    titleRomaji: 'yoru ni kakeru',
    artist: 'YOASOBI',
    description: '以夜晚為舞台的流行曲，充滿青春氣息與懸疑感，節奏輕快。',
    themeWords: [
      { word: '夜', kana: 'よる', romaji: 'yoru', meaning: '夜晚' },
      { word: '空', kana: 'そら', romaji: 'sora', meaning: '天空' },
      { word: '声', kana: 'こえ', romaji: 'koe', meaning: '聲音' },
      { word: '風', kana: 'かぜ', romaji: 'kaze', meaning: '風' },
      { word: '手', kana: 'て', romaji: 'te', meaning: '手' },
      { word: '二人', kana: 'ふたり', romaji: 'futari', meaning: '兩人' },
      { word: '朝', kana: 'あさ', romaji: 'asa', meaning: '早晨' },
    ],
  },
  {
    id: 'lemon',
    title: 'Lemon',
    titleKana: 'レモン',
    titleRomaji: 'remon',
    artist: '米津玄師',
    anime: 'アンナチュラル',
    description: '感人至深的劇集主題曲，以檸檬作為記憶的象徵，旋律哀傷優美。',
    themeWords: [
      { word: '花', kana: 'はな', romaji: 'hana', meaning: '花' },
      { word: '雨', kana: 'あめ', romaji: 'ame', meaning: '雨' },
      { word: '涙', kana: 'なみだ', romaji: 'namida', meaning: '眼淚' },
      { word: '匂い', kana: 'におい', romaji: 'nioi', meaning: '氣味' },
      { word: '戻る', kana: 'もどる', romaji: 'modoru', meaning: '回去' },
      { word: '切ない', kana: 'せつない', romaji: 'setsunai', meaning: '悲傷' },
    ],
  },
  {
    id: 'zankyo-sanka',
    title: '残響散歌',
    titleKana: 'ざんきょうさんか',
    titleRomaji: 'zankyou sanka',
    artist: 'Aimer',
    anime: '鬼滅の刃 遊郭編',
    description: '壯闊華麗的動畫片頭曲，結合日本傳統音樂元素與現代搖滾。',
    themeWords: [
      { word: '響く', kana: 'ひびく', romaji: 'hibiku', meaning: '迴響' },
      { word: '炎', kana: 'ほのお', romaji: 'honoo', meaning: '火焰' },
      { word: '刃', kana: 'やいば', romaji: 'yaiba', meaning: '刀刃' },
      { word: '宵', kana: 'よい', romaji: 'yoi', meaning: '黃昏' },
      { word: '舞う', kana: 'まう', romaji: 'mau', meaning: '飛舞' },
      { word: '鬼', kana: 'おに', romaji: 'oni', meaning: '鬼' },
      { word: '月', kana: 'つき', romaji: 'tsuki', meaning: '月亮' },
    ],
  },
  {
    id: 'gurenge',
    title: '紅蓮華',
    titleKana: 'ぐれんげ',
    titleRomaji: 'gurenge',
    artist: 'LiSA',
    anime: '鬼滅の刃',
    description: '熱血激昂的經典動畫主題曲，象徵著堅強意志與成長，廣受歡迎。',
    themeWords: [
      { word: '強い', kana: 'つよい', romaji: 'tsuyoi', meaning: '強大' },
      { word: '咲く', kana: 'さく', romaji: 'saku', meaning: '盛開' },
      { word: '赤', kana: 'あか', romaji: 'aka', meaning: '紅色' },
      { word: '泥', kana: 'どろ', romaji: 'doro', meaning: '泥' },
      { word: '闇', kana: 'やみ', romaji: 'yami', meaning: '黑暗' },
      { word: '運命', kana: 'うんめい', romaji: 'unmei', meaning: '命運' },
    ],
  },
  {
    id: 'shinjidai',
    title: '新時代',
    titleKana: 'しんじだい',
    titleRomaji: 'shinjidai',
    artist: 'Ado',
    anime: 'ONE PIECE FILM RED',
    description: '電影主題曲，充滿力量與希望，開創新時代的宣言之歌。',
    themeWords: [
      { word: '時代', kana: 'じだい', romaji: 'jidai', meaning: '時代' },
      { word: '新しい', kana: 'あたらしい', romaji: 'atarashii', meaning: '新的' },
      { word: '海', kana: 'うみ', romaji: 'umi', meaning: '海' },
      { word: '船', kana: 'ふね', romaji: 'fune', meaning: '船' },
      { word: '仲間', kana: 'なかま', romaji: 'nakama', meaning: '夥伴' },
      { word: '自由', kana: 'じゆう', romaji: 'jiyuu', meaning: '自由' },
    ],
  },
  {
    id: 'mixed-nuts',
    title: 'ミックスナッツ',
    titleKana: 'ミックスナッツ',
    titleRomaji: 'mikkusu nattsu',
    artist: 'Official髭男dism',
    anime: 'SPY×FAMILY',
    description: '輕快活潑的動畫片頭曲，描繪間諜家庭的日常，旋律輕鬆愉快。',
    themeWords: [
      { word: '家族', kana: 'かぞく', romaji: 'kazoku', meaning: '家族' },
      { word: '日々', kana: 'ひび', romaji: 'hibi', meaning: '日子' },
      { word: '笑顔', kana: 'えがお', romaji: 'egao', meaning: '笑容' },
      { word: '秘密', kana: 'ひみつ', romaji: 'himitsu', meaning: '秘密' },
      { word: '平和', kana: 'へいわ', romaji: 'heiwa', meaning: '和平' },
      { word: '色', kana: 'いろ', romaji: 'iro', meaning: '顏色' },
    ],
  },
  {
    id: 'ichizu',
    title: '一途',
    titleKana: 'いちず',
    titleRomaji: 'ichizu',
    artist: 'King Gnu',
    anime: '劇場版 呪術廻戦 0',
    description: '電影主題曲，以專一的情感為主題，旋律深情動人。',
    themeWords: [
      { word: '真っ直ぐ', kana: 'まっすぐ', romaji: 'massugu', meaning: '筆直' },
      { word: '想い', kana: 'おもい', romaji: 'omoi', meaning: '思念' },
      { word: '道', kana: 'みち', romaji: 'michi', meaning: '道路' },
      { word: '君', kana: 'きみ', romaji: 'kimi', meaning: '你' },
      { word: '呪い', kana: 'のろい', romaji: 'noroi', meaning: '詛咒' },
      { word: '永遠', kana: 'えいえん', romaji: 'eien', meaning: '永恆' },
    ],
  },
  {
    id: 'zenzenzense',
    title: '前前前世',
    titleKana: 'ぜんぜんぜんせ',
    titleRomaji: 'zenzenzense',
    artist: 'RADWIMPS',
    anime: '君の名は。',
    description: '經典動畫電影主題曲，描繪跨越時空的緣分，節奏強烈感人。',
    themeWords: [
      { word: '前', kana: 'まえ', romaji: 'mae', meaning: '前面' },
      { word: '世', kana: 'せ', romaji: 'se', meaning: '世代' },
      { word: '探す', kana: 'さがす', romaji: 'sagasu', meaning: '尋找' },
      { word: '名前', kana: 'なまえ', romaji: 'namae', meaning: '名字' },
      { word: '会う', kana: 'あう', romaji: 'au', meaning: '見面' },
      { word: '糸', kana: 'いと', romaji: 'ito', meaning: '線' },
      { word: '運命', kana: 'うんめい', romaji: 'unmei', meaning: '命運' },
    ],
  },
  {
    id: 'marigold',
    title: 'マリーゴールド',
    titleKana: 'マリーゴールド',
    titleRomaji: 'marii goorudo',
    artist: 'あいみょん',
    description: '溫暖柔和的流行曲，以金盞花為象徵，描繪純真美好的情感。',
    themeWords: [
      { word: '花', kana: 'はな', romaji: 'hana', meaning: '花' },
      { word: '黄色', kana: 'きいろ', romaji: 'kiiro', meaning: '黃色' },
      { word: '春', kana: 'はる', romaji: 'haru', meaning: '春天' },
      { word: '優しい', kana: 'やさしい', romaji: 'yasashii', meaning: '溫柔' },
      { word: '記憶', kana: 'きおく', romaji: 'kioku', meaning: '記憶' },
      { word: '側', kana: 'そば', romaji: 'soba', meaning: '身邊' },
    ],
  },
];
