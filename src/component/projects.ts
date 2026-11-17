export type Project = {
    slug: string
    title: string
    ground?: string
    site: string
    blurb: string
    credits: [role: string, value: string][]
    shots: string[]
}

// Fictional studio work; shot images are AI-generated (OpenAI via Codex CLI) mockups hosted on the Creght CDN.
const SHOTS: Record<string, string[]> = {
    'halden': [
        '/assets/halden_1.webp',
        '/assets/halden_2.webp',
        '/assets/halden_3.webp',
        '/assets/halden_4.webp',
    ],
    'mara-quist': [
        '/assets/mara_quist_1.webp',
        '/assets/mara_quist_2.webp',
        '/assets/mara_quist_3.webp',
        '/assets/mara_quist_4.webp',
    ],
    'atelier-nord': [
        '/assets/atelier_nord_1.webp',
        '/assets/atelier_nord_2.webp',
        '/assets/atelier_nord_3.webp',
        '/assets/atelier_nord_4.webp',
    ],
    'fieldwork': [
        '/assets/fieldwork_1.webp',
        '/assets/fieldwork_2.webp',
        '/assets/fieldwork_3.webp',
        '/assets/fieldwork_4.webp',
    ],
    'fieldwork-xx': [
        '/assets/fieldwork_xx_1.webp',
        '/assets/fieldwork_xx_2.webp',
        '/assets/fieldwork_xx_3.webp',
        '/assets/fieldwork_xx_4.webp',
    ],
    'brandt-kline': [
        '/assets/brandt_kline_1.webp',
        '/assets/brandt_kline_2.webp',
        '/assets/brandt_kline_3.webp',
        '/assets/brandt_kline_4.webp',
    ],
    'corvo': [
        '/assets/corvo_1.webp',
        '/assets/corvo_2.webp',
        '/assets/corvo_3.webp',
        '/assets/corvo_4.webp',
    ],
    'dollop': [
        '/assets/dollop_1.webp',
        '/assets/dollop_2.webp',
        '/assets/dollop_3.webp',
        '/assets/dollop_4.webp',
    ],
}

const FIELDWORK = 'Fieldwork'

export const PROJECTS: Project[] = [
    { slug: 'halden', title: 'Halden', site: '', blurb: 'Halden: human-made training data and expert review for teams building AI, from first dataset to production.', credits: [['Designer', 'Lena Moritz'], ['Client', 'Halden'], ['Agency', FIELDWORK]] },
    { slug: 'mara-quist', title: 'Mara Quist', site: '', blurb: 'The personal site of Mara Quist — author of Unafraid, leadership adviser and keynote speaker.', credits: [['Designer', 'Jonas Ekberg'], ['Client', 'Mara Quist'], ['Agency', FIELDWORK]] },
    { slug: 'atelier-nord', title: 'Atelier Nord', site: '', blurb: 'Atelier Nord, an interior studio shaping hotels, restaurants and spas that are felt before they are seen.', credits: [['Designer', 'Jonas Ekberg'], ['Client', 'Atelier Nord'], ['Agency', FIELDWORK]] },
    { slug: 'fieldwork', title: 'Fieldwork', site: '', blurb: 'Fieldwork, a strategic branding agency in New York, London and Berlin. Ideas people rally around.', credits: [['Designer', 'Jonas Ekberg'], ['Client', FIELDWORK], ['Agency', FIELDWORK]] },
    { slug: 'fieldwork-xx', title: 'Fieldwork XX', ground: '#3c5161', site: '', blurb: 'Fieldwork XX: twenty years of the agency in one digital capsule — twenty ideas, one chapter each.', credits: [['Designer', 'Jonas Ekberg'], ['Client', FIELDWORK], ['Agency', FIELDWORK]] },
    { slug: 'brandt-kline', title: 'Brandt & Kline', site: '', blurb: 'Brandt & Kline, a workers’ rights law firm that has stood with employees for three decades.', credits: [['Designer', 'Studio Pell'], ['Client', 'Brandt & Kline'], ['Agency', FIELDWORK]] },
    { slug: 'corvo', title: 'Corvo', ground: '#12553e', site: '', blurb: 'Corvo: currency management for companies that trade across borders. Collect. Convert. Pay.', credits: [['Designer', 'Ruth Alder'], ['Client', 'Corvo'], ['Agency', 'Northline']] },
    { slug: 'dollop', title: 'Dollop & Co', site: '', blurb: 'Dollop & Co, a homeware shop that doesn’t take itself too seriously: playful, direct and easy to browse. Opening soon.', credits: [] },
].map(p => ({ ...p, shots: SHOTS[p.slug] ?? [] }) as Project)
