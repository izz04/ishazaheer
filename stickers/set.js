// The sticker set, shared by the opening screen (index.html) and the preview page.
//
// src      artwork, relative to this folder
// tilt     resting angle in degrees
// to       section a click jumps to (decorative stickers have none)
// tip      tooltip on hover
// pos      previous background arrangement, retained for reference
// onFace   shown on the face only after Isha places it; others stay in the library
// face     portrait coordinates: [centre x, centre y, width] on 1122 x 1402 artwork
// heightScale optional vertical scale for a longer wrap without extra thickness
// shadow   follows the skin into deep shadow (the hair's shadow at the temple); others stay lighter// width    preview page: [large px, small px]
// still    decorative: no peel, no tooltip, no click
// the rest are makeSticker options (ink, holes, border, crop, tolerance)

export const STICKERS = [
  // left side
  // placed by Isha (tools/place.html): on the outer edge of the screen-right cheek, right of BeeBot
  { src: 'nyu-torch.jpg', onFace: true, tilt: -8, label: 'NYU Gallatin', to: 'about', face: [749, 615, 64], pos: [10, 18, 13],
    tip: 'NYU Gallatin · CS & Design · Class of 2027 → About' },
  { src: 'nyu-stern.png', onFace: true, heightScale: 0.805, tilt: 14.54, wide: true, label: 'Stern Exchange', to: 'work', face: [609, 534, 205], pos: [19, 36, 28],
    tip: 'Stern Exchange · AI platform for business cases · 2026 → Work' },
  // placed by Isha (tools/place.html): on the screen-right cheek
  { src: 'beebot.png', onFace: true, tilt: -7, label: 'BeeBot', to: 'work', face: [704, 600, 81], pos: [8, 54, 13],
    tip: 'BeeBot @ Hopscotch Labs · AI audio companion · 2025 → Work' },
  // placed by Isha: on the screen-left cheek, above-left of </>, below the heart
  { src: 'fibrux.png', onFace: true, tilt: -10, label: 'FIBRUX', to: 'work', face: [423, 525, 90], pos: [21, 58, 15],
    tip: 'FIBRUX · co-founder & CEO · 25 people, 5+ countries · 2021–2026 → Work' },
  // placed by Isha (tools/place.html): on the screen-left cheek, below the spider and left of </>
  { src: 'black-tech-street.png', onFace: true, tilt: 24, wide: true, ink: '#161616', holes: true, label: 'Black Tech Street', to: 'community', face: [405, 585, 153], pos: [11, 76, 22],
    tip: 'G-ACE / MIT Support · Black Tech Street, Tulsa · Summer 2025 → Research & community' },

  // right side: </> with three smaller project stickers around it, then the heart and palette
  // placed by Isha (tools/place.html)
  { src: 'code.svg', onFace: true, tilt: 29, width: [220, 90], label: '</>', to: 'playground', face: [467, 571, 60], pos: [80, 44, 15],
    tip: 'The coder side: AI products, web apps, experiments → Playground' },
  // placed by Isha (tools/place.html): on the screen-left cheek, between the spider and </>
  { src: 'lmgc.png', onFace: true, tilt: 21, label: 'La Martiniere Girls\' College', to: 'projects', face: [481, 528, 61], pos: [70, 30, 11],
    tip: 'La Martiniere Girls\' College · school website, built with FIBRUX → Projects' },
  // just the wordmark and script: no frame, no tagline. Placed by Isha (tools/place.html):
  // along the jaw, between the chin and the screen-right cheek
  { src: 'bdazzle.png', onFace: true, crop: [60, 58, 590, 156], tilt: -28, width: [300, 120], label: 'BDazzle', to: 'projects', face: [657, 706, 89], pos: [91, 34, 13],
    tip: 'BDazzle · customise-anything app concept · Comfest 2019 runner-up → Projects' },
  // just the monitor icon, no words; the fabric stays the logo's teal
  { src: 'detritium.webp', crop: [40, 0, 570, 504], tilt: 5, border: 'key', width: [220, 100], label: 'Project Detritium', to: 'projects', face: [655, 715, 50], pos: [89, 58, 10],
    tip: 'Project Detritium · e-waste awareness site · IEO runner-up · 2021 → Projects' },
  { src: 'heart.svg', onFace: true, tilt: -12, width: [150, 60], still: true, label: 'Heart', face: [426, 465, 45], pos: [72, 14, 8] },
  // placed by Isha (tools/place.html): on the screen-right cheek, under BeeBot
  { src: 'paintbrush.svg', onFace: true, tilt: 6, width: [220, 95], label: 'Palette', to: 'art', face: [716, 658, 66], pos: [88, 16, 14],
    tip: 'The artist side: paintings, drawings, lettering → Art' },

  // placed to balance the two sides
  // placed by Isha (tools/place.html): small, on the top of the nose between the eyes
  { src: 'sunflower.webp', onFace: true, tilt: 8, width: [180, 75], still: true, tolerance: 115, label: 'Sunflower', face: [626, 492, 38], pos: [27, 13, 10] },
  // placed by Isha (tools/place.html): on the screen-right temple, beside the eyebrow, in the
  // hair's shadow
  { src: 'achievements.svg', onFace: true, shadow: true, tilt: 8, width: [200, 90], label: 'Achievements', to: 'achievements', face: [753, 378, 66], pos: [31, 62, 9],
    tip: 'Gallatin · Gallatin Futures · Global Pathways · Adam Taki Scholar → Achievements' },
  // the boarding pass; Isha took it off (it was on the chest, right of the necklace's pendant)
  { src: 'lucknow-nyc.svg', tilt: -4, width: [280, 120], label: 'Lucknow → NYC', to: 'about', face: [683, 1162, 170], pos: [26, 86, 19],
    tip: 'Lucknow → New York · from La Martiniere to NYU → About' },
  // placed by Isha (tools/place.html): on the screen-left cheek, below Black Tech Street
  { src: 'biryani.png', onFace: true, tilt: 30, width: [230, 95], still: true, border: 'none', tolerance: 150, label: 'Biryani', face: [428, 647, 88], pos: [79, 78, 16] },
];

// The camera tour: scrolling flies to these stickers in order (clicking one flies straight to
// it), each with its card. Decorative stickers aren't stops.
// (order set by Isha in tools/cards.html)
export const TOUR = ['NYU Gallatin', 'Achievements', 'Stern Exchange', 'BeeBot', 'FIBRUX', 'Black Tech Street',
  'La Martiniere Girls\' College', '</>', 'Palette', 'BDazzle'];

// Each stop's card, like a résumé entry (drafted from Isha's résumés; she edits them in
// tools/cards.html): when, title, role, and a few short points. The link goes to the
// sticker's section. 'About me' is stop 00, before the stickers: the camera moves in on the
// whole face rather than one sticker.
export const INTRO = 'About me';
export const CARDS = {
  // About me, NYU Gallatin, Stern Exchange and Achievements: written by Isha in tools/cards.html
  [INTRO]: { when: 'Lucknow → New York', title: 'Hi, I\'m Isha', role: 'Software Engineer and Artist',
    points: ['Hi, I’m Isha! I study Computer Science and Studio Arts at NYU, and I love painting and coding. Both give me a way to take something I’ve imagined and make it real.',
      'I’ve worked on AI applications, backend services, and real-time web systems. I enjoy figuring things out as I build, paying attention to the small details, and making something that people find useful.'] },
  'NYU Gallatin': { when: 'Expected Graduation May 2027', title: 'NYU Gallatin · New York',
    role: 'BA, Individualized Study: Computer Science & Design',
    points: ['GPA: 3.8', 'Minors: Web Programming and Applications; Business of Entertainment, Media, and Technology',
      'Coursework: Data Structures, Basic Algorithms, Artificial Intelligence, Software Engineering, Discrete Mathematics, A.I. and Tech Product Management'] },
  'Stern Exchange': { when: 'Mar 2026 – Present', title: 'NYU Stern Exchange',
    role: 'Product and AI Software Engineering Intern | NYU Stern School of Business | New York, USA',
    points: ['Launched a Gemini/Vertex AI workflow turning faculty inputs into validated cases with multimedia and narration.',
      'Built live classroom sessions with Next.js, TypeScript, and Supabase Realtime, supporting polls, discussions, and cohort visualizations.',
      'Used Sentry, analytics, and faculty feedback to diagnose issues, define requirements, and guide releases.'] },
  // BeeBot, Black Tech Street, BDazzle, </> and Palette: edited by Isha in tools/cards.html
  'BeeBot': { when: 'Aug 2025 – Present', title: 'BeeBot @ Hopscotch Labs ',
    role: 'Software Engineering Intern | Hopscotch Labs | New York, USA',
    points: ['An AI audio companion with personal updates on nearby places, people and events',
      'Scala/Akka ingestion for Google Maps saved lists, enriched through Google Places',
      'Event relevance scoring, and an OpenAI/Claude content pipeline with prompt validators'] },
  'Black Tech Street': { when: 'May – Jul 2025', title: 'Black Tech Street · Tulsa, OK',
    role: 'Research & Strategy Intern, G-ACE / MIT Support',
    points: ['Turned interviews, site visits and field notes into findings on equitable AI adoption',
      'Briefings on AI resilience for executives, policymakers and community partners'] },
  'FIBRUX': { when: 'Apr 2021 – Apr 2026', title: 'FIBRUX', role: 'Co-founder & CEO',
    points: ['Started with no capital; led 25 contributors in 5+ countries on three continents',
      'Up to $10,000 in second-year revenue in India',
      'Websites and branding for La Martiniere Girls\' College, Tara Gupta, Edge Architects and Tatijana Shoan'] },
  // written by Isha in tools/cards.html; the points describe the live site's build (Next.js, Tailwind, Vercel)
  'La Martiniere Girls\' College': { when: '2023', title: 'School Website Design',
    role: 'La Martiniere Girls\' College | Lucknow, India',
    points: ['Developed a statically generated Next.js and React site styled with Tailwind CSS, with dynamic routes for notices and campus news.',
      'Scoped requirements with school staff, organised 50+ pages of content across admissions, academics, events and alumni, and shipped it to production on Vercel.'] },
  'BDazzle': { when: '2020 and 2024', title: 'Business Models Designs',
    role: '',
    points: ['Better World Media | Campus platform business-model project | 2024 Designed a campus platform concept combining event listings, free-food alerts, book lending, and peer resources; documented a student-engagement and monetization model through campus partnerships and targeted advertising.',
      'BDAZZLE | Custom e-commerce business-model project | 2020  Developed a mobile commerce concept for customizable products that connected independent creators with buyers and emphasized choice and accessibility; presented a projected revenue model in a Shark Tank-style competition.'] },
  '</>': { when: 'Playground', title: 'Skills',
    role: '',
    points: ['Languages and Web: Java, C, Scala, JavaScript, TypeScript, SQL/PostgreSQL, HTML, CSS, SCSS, Next.js',
      'Backend and quality: Akka, Supabase Realtime, Google Maps/Places APIs, ScalaTest, Git, Sentry, API and JSON testing',
      'AI engineering: Gemini, Vertex AI, OpenAI API, Claude API; LLM workflow design, prompt engineering, schema-constrained outputs, hallucination controls, relevance scoring',
      'Design Tools: Adobe Illustrator, Photoshop, After Effects, Premiere Pro, PTGui'] },
  'Palette': { when: '', title: 'ARTIST',
    role: 'Paintings, drawings and lettering',
    points: ['Art Styles:'] },
  'Achievements': { when: 'Scholarships', title: 'Achievements', role: 'NYU Gallatin',
    points: ['Full NYU Gallatin Scholarship Awardee', 'Gallatin Futures Scholar ($10,000/year for 4 years)',
      'Global Pathways Scholar (2025)', 'Adam Taki Scholar (2026-27)',
      'Sir George Thomas Medal for Example and Service (2023) at La Martiniere Girls\' College'] },
};

// artwork paths are relative to this file, wherever the page that imports it lives
for (const s of STICKERS) s.url = new URL(s.src, import.meta.url).href;
