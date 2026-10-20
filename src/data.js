export const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  [' '],
]

const SHIFTED = { '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '_': '-', '+': '=', '{': '[', '}': ']', ':': ';', '"': "'", '<': ',', '>': '.', '?': '/' }
export const baseKey = (c) => (c ? (SHIFTED[c] || c.toLowerCase()) : '')

const FINGERS = ['1qaz', '2wsx', '3edc', '4rfv5tgb', '6yhn7ujm', '8ik,', '9ol.', "0p;-[]='/="]
export const fingerOf = (k) => (k === ' ' ? 8 : FINGERS.findIndex((g) => g.includes(k)))

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced']

export const EXERCISES = [
  { id: 'intro', level: 'Beginner', title: 'Hello, {name}', blurb: 'A friendly warm-up with your own name.', text: 'I am {name}. I am learning to type fast and clean.' },
  { id: 'home', level: 'Beginner', title: 'Home row', blurb: 'Rest your fingers on a s d f and j k l ;', text: 'asdf jkl; fads lass flask salad dad had glad fall hall ask jak sad flag gash dash' },
  { id: 'top', level: 'Beginner', title: 'Top row', blurb: 'Reach up without losing your place.', text: 'quiet power tower pretty write your type route outer perfect true poetry entire' },
  { id: 'bottom', level: 'Beginner', title: 'Bottom row', blurb: 'The reach that trips most people up.', text: 'zebra vexed numb calm bench mix vim climb zoom comb cabin maze convex number' },
  { id: 'numbers', level: 'Intermediate', title: 'Number row', blurb: 'Digits without looking down.', text: '2026 1984 305 7788 4096 1200 9371 5820 6143 8057 1999 2468 1357' },
  { id: 'words', level: 'Intermediate', title: 'Everyday words', blurb: 'The words you type most often.', text: 'people because through should around another between thought never always might really different small system great place world after still' },
  { id: 'pangram', level: 'Intermediate', title: 'Every letter', blurb: 'Pangrams that use the whole alphabet.', text: 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.' },
  { id: 'punct', level: 'Advanced', title: 'Punctuation', blurb: 'Commas, quotes, brackets and Shift.', text: 'Wait, what? Yes! It\'s fine; however, we\'ll go (soon) - isn\'t it? "Maybe," she said.' },
  { id: 'code', level: 'Advanced', title: 'Code snippet', blurb: 'Symbols and brackets for developers.', text: 'const sum = (a, b) => { return a + b; }; if (x >= 10 && y !== 0) { run(); }' },
  { id: 'story', level: 'Advanced', title: 'Short paragraph', blurb: 'Stamina for longer writing.', text: 'Good typing is a quiet skill. It grows each day you practise, one clean keystroke at a time. Keep your eyes on the screen, your wrists relaxed, and let rhythm do the work.' },
  { id: 'sprint30', level: 'Intermediate', time: 30, title: '30 second sprint', blurb: 'Random words, race the clock.' },
  { id: 'sprint60', level: 'Advanced', time: 60, title: '60 second marathon', blurb: 'One full minute of random words.' },
]

const POOL = 'time year people way day man thing woman life child world school state family student group country problem hand part place case week company system program question work government number night point home water room mother area money story fact month lot right study book eye job word business issue side kind head house service friend father power hour game line end member law car city community name team minute idea kid body'.split(' ')
export const genWords = () => Array.from({ length: 160 }, () => POOL[Math.floor(Math.random() * POOL.length)]).join(' ')
