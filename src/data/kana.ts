export interface KanaChar {
  char: string;
  romaji: string;
  row: string;
  type: 'basic' | 'dakuten' | 'handakuten' | 'yoon';
}

export const hiraganaData: KanaChar[] = [
  // Basic (清音)
  { char: 'あ', romaji: 'a', row: 'a', type: 'basic' },
  { char: 'い', romaji: 'i', row: 'a', type: 'basic' },
  { char: 'う', romaji: 'u', row: 'a', type: 'basic' },
  { char: 'え', romaji: 'e', row: 'a', type: 'basic' },
  { char: 'お', romaji: 'o', row: 'a', type: 'basic' },
  
  { char: 'か', romaji: 'ka', row: 'ka', type: 'basic' },
  { char: 'き', romaji: 'ki', row: 'ka', type: 'basic' },
  { char: 'く', romaji: 'ku', row: 'ka', type: 'basic' },
  { char: 'け', romaji: 'ke', row: 'ka', type: 'basic' },
  { char: 'こ', romaji: 'ko', row: 'ka', type: 'basic' },
  
  { char: 'さ', romaji: 'sa', row: 'sa', type: 'basic' },
  { char: 'し', romaji: 'shi', row: 'sa', type: 'basic' },
  { char: 'す', romaji: 'su', row: 'sa', type: 'basic' },
  { char: 'せ', romaji: 'se', row: 'sa', type: 'basic' },
  { char: 'そ', romaji: 'so', row: 'sa', type: 'basic' },
  
  { char: 'た', romaji: 'ta', row: 'ta', type: 'basic' },
  { char: 'ち', romaji: 'chi', row: 'ta', type: 'basic' },
  { char: 'つ', romaji: 'tsu', row: 'ta', type: 'basic' },
  { char: 'て', romaji: 'te', row: 'ta', type: 'basic' },
  { char: 'と', romaji: 'to', row: 'ta', type: 'basic' },
  
  { char: 'な', romaji: 'na', row: 'na', type: 'basic' },
  { char: 'に', romaji: 'ni', row: 'na', type: 'basic' },
  { char: 'ぬ', romaji: 'nu', row: 'na', type: 'basic' },
  { char: 'ね', romaji: 'ne', row: 'na', type: 'basic' },
  { char: 'の', romaji: 'no', row: 'na', type: 'basic' },
  
  { char: 'は', romaji: 'ha', row: 'ha', type: 'basic' },
  { char: 'ひ', romaji: 'hi', row: 'ha', type: 'basic' },
  { char: 'ふ', romaji: 'fu', row: 'ha', type: 'basic' },
  { char: 'へ', romaji: 'he', row: 'ha', type: 'basic' },
  { char: 'ほ', romaji: 'ho', row: 'ha', type: 'basic' },
  
  { char: 'ま', romaji: 'ma', row: 'ma', type: 'basic' },
  { char: 'み', romaji: 'mi', row: 'ma', type: 'basic' },
  { char: 'む', romaji: 'mu', row: 'ma', type: 'basic' },
  { char: 'め', romaji: 'me', row: 'ma', type: 'basic' },
  { char: 'も', romaji: 'mo', row: 'ma', type: 'basic' },
  
  { char: 'や', romaji: 'ya', row: 'ya', type: 'basic' },
  { char: 'ゆ', romaji: 'yu', row: 'ya', type: 'basic' },
  { char: 'よ', romaji: 'yo', row: 'ya', type: 'basic' },
  
  { char: 'ら', romaji: 'ra', row: 'ra', type: 'basic' },
  { char: 'り', romaji: 'ri', row: 'ra', type: 'basic' },
  { char: 'る', romaji: 'ru', row: 'ra', type: 'basic' },
  { char: 'れ', romaji: 're', row: 'ra', type: 'basic' },
  { char: 'ろ', romaji: 'ro', row: 'ra', type: 'basic' },
  
  { char: 'わ', romaji: 'wa', row: 'wa', type: 'basic' },
  { char: 'を', romaji: 'wo', row: 'wa', type: 'basic' },
  { char: 'ん', romaji: 'n', row: 'wa', type: 'basic' },
  
  // Dakuten (濁音)
  { char: 'が', romaji: 'ga', row: 'ka', type: 'dakuten' },
  { char: 'ぎ', romaji: 'gi', row: 'ka', type: 'dakuten' },
  { char: 'ぐ', romaji: 'gu', row: 'ka', type: 'dakuten' },
  { char: 'げ', romaji: 'ge', row: 'ka', type: 'dakuten' },
  { char: 'ご', romaji: 'go', row: 'ka', type: 'dakuten' },
  
  { char: 'ざ', romaji: 'za', row: 'sa', type: 'dakuten' },
  { char: 'じ', romaji: 'ji', row: 'sa', type: 'dakuten' },
  { char: 'ず', romaji: 'zu', row: 'sa', type: 'dakuten' },
  { char: 'ぜ', romaji: 'ze', row: 'sa', type: 'dakuten' },
  { char: 'ぞ', romaji: 'zo', row: 'sa', type: 'dakuten' },
  
  { char: 'だ', romaji: 'da', row: 'ta', type: 'dakuten' },
  { char: 'ぢ', romaji: 'ji', row: 'ta', type: 'dakuten' },
  { char: 'づ', romaji: 'zu', row: 'ta', type: 'dakuten' },
  { char: 'で', romaji: 'de', row: 'ta', type: 'dakuten' },
  { char: 'ど', romaji: 'do', row: 'ta', type: 'dakuten' },
  
  { char: 'ば', romaji: 'ba', row: 'ha', type: 'dakuten' },
  { char: 'び', romaji: 'bi', row: 'ha', type: 'dakuten' },
  { char: 'ぶ', romaji: 'bu', row: 'ha', type: 'dakuten' },
  { char: 'べ', romaji: 'be', row: 'ha', type: 'dakuten' },
  { char: 'ぼ', romaji: 'bo', row: 'ha', type: 'dakuten' },
  
  // Handakuten (半濁音)
  { char: 'ぱ', romaji: 'pa', row: 'ha', type: 'handakuten' },
  { char: 'ぴ', romaji: 'pi', row: 'ha', type: 'handakuten' },
  { char: 'ぷ', romaji: 'pu', row: 'ha', type: 'handakuten' },
  { char: 'ぺ', romaji: 'pe', row: 'ha', type: 'handakuten' },
  { char: 'ぽ', romaji: 'po', row: 'ha', type: 'handakuten' },
  
  // Yōon (拗音)
  { char: 'きゃ', romaji: 'kya', row: 'ka', type: 'yoon' },
  { char: 'きゅ', romaji: 'kyu', row: 'ka', type: 'yoon' },
  { char: 'きょ', romaji: 'kyo', row: 'ka', type: 'yoon' },
  
  { char: 'しゃ', romaji: 'sha', row: 'sa', type: 'yoon' },
  { char: 'しゅ', romaji: 'shu', row: 'sa', type: 'yoon' },
  { char: 'しょ', romaji: 'sho', row: 'sa', type: 'yoon' },
  
  { char: 'ちゃ', romaji: 'cha', row: 'ta', type: 'yoon' },
  { char: 'ちゅ', romaji: 'chu', row: 'ta', type: 'yoon' },
  { char: 'ちょ', romaji: 'cho', row: 'ta', type: 'yoon' },
  
  { char: 'にゃ', romaji: 'nya', row: 'na', type: 'yoon' },
  { char: 'にゅ', romaji: 'nyu', row: 'na', type: 'yoon' },
  { char: 'にょ', romaji: 'nyo', row: 'na', type: 'yoon' },
  
  { char: 'ひゃ', romaji: 'hya', row: 'ha', type: 'yoon' },
  { char: 'ひゅ', romaji: 'hyu', row: 'ha', type: 'yoon' },
  { char: 'ひょ', romaji: 'hyo', row: 'ha', type: 'yoon' },
  
  { char: 'みゃ', romaji: 'mya', row: 'ma', type: 'yoon' },
  { char: 'みゅ', romaji: 'myu', row: 'ma', type: 'yoon' },
  { char: 'みょ', romaji: 'myo', row: 'ma', type: 'yoon' },
  
  { char: 'りゃ', romaji: 'rya', row: 'ra', type: 'yoon' },
  { char: 'りゅ', romaji: 'ryu', row: 'ra', type: 'yoon' },
  { char: 'りょ', romaji: 'ryo', row: 'ra', type: 'yoon' },
  
  { char: 'ぎゃ', romaji: 'gya', row: 'ka', type: 'yoon' },
  { char: 'ぎゅ', romaji: 'gyu', row: 'ka', type: 'yoon' },
  { char: 'ぎょ', romaji: 'gyo', row: 'ka', type: 'yoon' },
  
  { char: 'じゃ', romaji: 'ja', row: 'sa', type: 'yoon' },
  { char: 'じゅ', romaji: 'ju', row: 'sa', type: 'yoon' },
  { char: 'じょ', romaji: 'jo', row: 'sa', type: 'yoon' },
  
  { char: 'びゃ', romaji: 'bya', row: 'ha', type: 'yoon' },
  { char: 'びゅ', romaji: 'byu', row: 'ha', type: 'yoon' },
  { char: 'びょ', romaji: 'byo', row: 'ha', type: 'yoon' },
  
  { char: 'ぴゃ', romaji: 'pya', row: 'ha', type: 'yoon' },
  { char: 'ぴゅ', romaji: 'pyu', row: 'ha', type: 'yoon' },
  { char: 'ぴょ', romaji: 'pyo', row: 'ha', type: 'yoon' },
];

export const katakanaData: KanaChar[] = [
  // Basic (清音)
  { char: 'ア', romaji: 'a', row: 'a', type: 'basic' },
  { char: 'イ', romaji: 'i', row: 'a', type: 'basic' },
  { char: 'ウ', romaji: 'u', row: 'a', type: 'basic' },
  { char: 'エ', romaji: 'e', row: 'a', type: 'basic' },
  { char: 'オ', romaji: 'o', row: 'a', type: 'basic' },
  
  { char: 'カ', romaji: 'ka', row: 'ka', type: 'basic' },
  { char: 'キ', romaji: 'ki', row: 'ka', type: 'basic' },
  { char: 'ク', romaji: 'ku', row: 'ka', type: 'basic' },
  { char: 'ケ', romaji: 'ke', row: 'ka', type: 'basic' },
  { char: 'コ', romaji: 'ko', row: 'ka', type: 'basic' },
  
  { char: 'サ', romaji: 'sa', row: 'sa', type: 'basic' },
  { char: 'シ', romaji: 'shi', row: 'sa', type: 'basic' },
  { char: 'ス', romaji: 'su', row: 'sa', type: 'basic' },
  { char: 'セ', romaji: 'se', row: 'sa', type: 'basic' },
  { char: 'ソ', romaji: 'so', row: 'sa', type: 'basic' },
  
  { char: 'タ', romaji: 'ta', row: 'ta', type: 'basic' },
  { char: 'チ', romaji: 'chi', row: 'ta', type: 'basic' },
  { char: 'ツ', romaji: 'tsu', row: 'ta', type: 'basic' },
  { char: 'テ', romaji: 'te', row: 'ta', type: 'basic' },
  { char: 'ト', romaji: 'to', row: 'ta', type: 'basic' },
  
  { char: 'ナ', romaji: 'na', row: 'na', type: 'basic' },
  { char: 'ニ', romaji: 'ni', row: 'na', type: 'basic' },
  { char: 'ヌ', romaji: 'nu', row: 'na', type: 'basic' },
  { char: 'ネ', romaji: 'ne', row: 'na', type: 'basic' },
  { char: 'ノ', romaji: 'no', row: 'na', type: 'basic' },
  
  { char: 'ハ', romaji: 'ha', row: 'ha', type: 'basic' },
  { char: 'ヒ', romaji: 'hi', row: 'ha', type: 'basic' },
  { char: 'フ', romaji: 'fu', row: 'ha', type: 'basic' },
  { char: 'ヘ', romaji: 'he', row: 'ha', type: 'basic' },
  { char: 'ホ', romaji: 'ho', row: 'ha', type: 'basic' },
  
  { char: 'マ', romaji: 'ma', row: 'ma', type: 'basic' },
  { char: 'ミ', romaji: 'mi', row: 'ma', type: 'basic' },
  { char: 'ム', romaji: 'mu', row: 'ma', type: 'basic' },
  { char: 'メ', romaji: 'me', row: 'ma', type: 'basic' },
  { char: 'モ', romaji: 'mo', row: 'ma', type: 'basic' },
  
  { char: 'ヤ', romaji: 'ya', row: 'ya', type: 'basic' },
  { char: 'ユ', romaji: 'yu', row: 'ya', type: 'basic' },
  { char: 'ヨ', romaji: 'yo', row: 'ya', type: 'basic' },
  
  { char: 'ラ', romaji: 'ra', row: 'ra', type: 'basic' },
  { char: 'リ', romaji: 'ri', row: 'ra', type: 'basic' },
  { char: 'ル', romaji: 'ru', row: 'ra', type: 'basic' },
  { char: 'レ', romaji: 're', row: 'ra', type: 'basic' },
  { char: 'ロ', romaji: 'ro', row: 'ra', type: 'basic' },
  
  { char: 'ワ', romaji: 'wa', row: 'wa', type: 'basic' },
  { char: 'ヲ', romaji: 'wo', row: 'wa', type: 'basic' },
  { char: 'ン', romaji: 'n', row: 'wa', type: 'basic' },
  
  // Dakuten (濁音)
  { char: 'ガ', romaji: 'ga', row: 'ka', type: 'dakuten' },
  { char: 'ギ', romaji: 'gi', row: 'ka', type: 'dakuten' },
  { char: 'グ', romaji: 'gu', row: 'ka', type: 'dakuten' },
  { char: 'ゲ', romaji: 'ge', row: 'ka', type: 'dakuten' },
  { char: 'ゴ', romaji: 'go', row: 'ka', type: 'dakuten' },
  
  { char: 'ザ', romaji: 'za', row: 'sa', type: 'dakuten' },
  { char: 'ジ', romaji: 'ji', row: 'sa', type: 'dakuten' },
  { char: 'ズ', romaji: 'zu', row: 'sa', type: 'dakuten' },
  { char: 'ゼ', romaji: 'ze', row: 'sa', type: 'dakuten' },
  { char: 'ゾ', romaji: 'zo', row: 'sa', type: 'dakuten' },
  
  { char: 'ダ', romaji: 'da', row: 'ta', type: 'dakuten' },
  { char: 'ヂ', romaji: 'ji', row: 'ta', type: 'dakuten' },
  { char: 'ヅ', romaji: 'zu', row: 'ta', type: 'dakuten' },
  { char: 'デ', romaji: 'de', row: 'ta', type: 'dakuten' },
  { char: 'ド', romaji: 'do', row: 'ta', type: 'dakuten' },
  
  { char: 'バ', romaji: 'ba', row: 'ha', type: 'dakuten' },
  { char: 'ビ', romaji: 'bi', row: 'ha', type: 'dakuten' },
  { char: 'ブ', romaji: 'bu', row: 'ha', type: 'dakuten' },
  { char: 'ベ', romaji: 'be', row: 'ha', type: 'dakuten' },
  { char: 'ボ', romaji: 'bo', row: 'ha', type: 'dakuten' },
  
  // Handakuten (半濁音)
  { char: 'パ', romaji: 'pa', row: 'ha', type: 'handakuten' },
  { char: 'ピ', romaji: 'pi', row: 'ha', type: 'handakuten' },
  { char: 'プ', romaji: 'pu', row: 'ha', type: 'handakuten' },
  { char: 'ペ', romaji: 'pe', row: 'ha', type: 'handakuten' },
  { char: 'ポ', romaji: 'po', row: 'ha', type: 'handakuten' },
  
  // Yōon (拗音)
  { char: 'キャ', romaji: 'kya', row: 'ka', type: 'yoon' },
  { char: 'キュ', romaji: 'kyu', row: 'ka', type: 'yoon' },
  { char: 'キョ', romaji: 'kyo', row: 'ka', type: 'yoon' },
  
  { char: 'シャ', romaji: 'sha', row: 'sa', type: 'yoon' },
  { char: 'シュ', romaji: 'shu', row: 'sa', type: 'yoon' },
  { char: 'ショ', romaji: 'sho', row: 'sa', type: 'yoon' },
  
  { char: 'チャ', romaji: 'cha', row: 'ta', type: 'yoon' },
  { char: 'チュ', romaji: 'chu', row: 'ta', type: 'yoon' },
  { char: 'チョ', romaji: 'cho', row: 'ta', type: 'yoon' },
  
  { char: 'ニャ', romaji: 'nya', row: 'na', type: 'yoon' },
  { char: 'ニュ', romaji: 'nyu', row: 'na', type: 'yoon' },
  { char: 'ニョ', romaji: 'nyo', row: 'na', type: 'yoon' },
  
  { char: 'ヒャ', romaji: 'hya', row: 'ha', type: 'yoon' },
  { char: 'ヒュ', romaji: 'hyu', row: 'ha', type: 'yoon' },
  { char: 'ヒョ', romaji: 'hyo', row: 'ha', type: 'yoon' },
  
  { char: 'ミャ', romaji: 'mya', row: 'ma', type: 'yoon' },
  { char: 'ミュ', romaji: 'myu', row: 'ma', type: 'yoon' },
  { char: 'ミョ', romaji: 'myo', row: 'ma', type: 'yoon' },
  
  { char: 'リャ', romaji: 'rya', row: 'ra', type: 'yoon' },
  { char: 'リュ', romaji: 'ryu', row: 'ra', type: 'yoon' },
  { char: 'リョ', romaji: 'ryo', row: 'ra', type: 'yoon' },
  
  { char: 'ギャ', romaji: 'gya', row: 'ka', type: 'yoon' },
  { char: 'ギュ', romaji: 'gyu', row: 'ka', type: 'yoon' },
  { char: 'ギョ', romaji: 'gyo', row: 'ka', type: 'yoon' },
  
  { char: 'ジャ', romaji: 'ja', row: 'sa', type: 'yoon' },
  { char: 'ジュ', romaji: 'ju', row: 'sa', type: 'yoon' },
  { char: 'ジョ', romaji: 'jo', row: 'sa', type: 'yoon' },
  
  { char: 'ビャ', romaji: 'bya', row: 'ha', type: 'yoon' },
  { char: 'ビュ', romaji: 'byu', row: 'ha', type: 'yoon' },
  { char: 'ビョ', romaji: 'byo', row: 'ha', type: 'yoon' },
  
  { char: 'ピャ', romaji: 'pya', row: 'ha', type: 'yoon' },
  { char: 'ピュ', romaji: 'pyu', row: 'ha', type: 'yoon' },
  { char: 'ピョ', romaji: 'pyo', row: 'ha', type: 'yoon' },
];

export const rowNames = {
  a: 'あ行',
  ka: 'か行',
  sa: 'さ行',
  ta: 'た行',
  na: 'な行',
  ha: 'は行',
  ma: 'ま行',
  ya: 'や行',
  ra: 'ら行',
  wa: 'わ行',
};
