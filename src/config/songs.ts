export interface Song {
  id: string
  name: string
  artist: string
}

export const CURATED_SONGS: Song[] = [
  { id: 'dQw4w9WgXcQ', name: 'Never Gonna Give You Up', artist: 'Rick Astley' },
  { id: 'kJQP7kiw5Fk', name: 'Despacito', artist: 'Luis Fonsi' },
  { id: '9bZkp7q19f0', name: 'Gangnam Style', artist: 'PSY' },
  { id: 'JGwWNGJdvx8', name: 'Shape of You', artist: 'Ed Sheeran' },
  { id: 'fJ9rUzIMcZQ', name: 'Bohemian Rhapsody', artist: 'Queen' },
  { id: 'hT_nvWreIhg', name: 'Counting Stars', artist: 'OneRepublic' },
  { id: 'RgKAFK5djSk', name: 'See You Again', artist: 'Wiz Khalifa' },
  { id: 'OPf0YbXqDm0', name: 'Uptown Funk', artist: 'Bruno Mars' },
  { id: 'e-ORhEE9VVg', name: 'Blank Space', artist: 'Taylor Swift' },
  { id: 'YQHsXMglC9A', name: 'Hello', artist: 'Adele' },
  { id: 'kXYiU_JCYtU', name: 'Numb', artist: 'Linkin Park' },
  { id: 'hLQl3WQQoQ0', name: 'Someone Like You', artist: 'Adele' },
  { id: 'lp-EO5I60KA', name: 'Everybody Wants To Rule The World', artist: 'Tears for Fears' },
  { id: 'Zi_XLOBDo_Y', name: 'Billie Jean', artist: 'Michael Jackson' },
  { id: 'oRdxUFDoQe0', name: 'Wake Me Up', artist: 'Avicii' },
]

export const EXAMPLE_SONG = CURATED_SONGS.find(s => s.id === 'fJ9rUzIMcZQ')!

export function getRandomSong(): Song {
  return CURATED_SONGS[Math.floor(Math.random() * CURATED_SONGS.length)]
}
