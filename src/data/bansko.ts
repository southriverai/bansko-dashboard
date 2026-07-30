// Bansko Dashboard — content model.
// Curated starting data for the nomad community hub. Group names are real; invite
// links are intentionally left blank (`href` omitted) until verified — drop real
// WhatsApp invite URLs in here as you confirm them. Events/weather are wired to
// static samples for now; swap for a live feed/API later (see README).

export type LinkItem = {
  name: string;
  href?: string; // add a verified URL to make it a clickable "Join"/"Open"
  note?: string;
};

export type EventItem = {
  title: string;
  when: string; // human-readable; replace with a datetime + live feed later
  where?: string;
  tag?: string;
};

export type Section = {
  id: string;
  title: string;
  emoji: string;
  blurb: string;
};

export const SECTIONS: Section[] = [
  { id: "groups", title: "Community Groups", emoji: "💬", blurb: "The WhatsApp groups worth being in." },
  { id: "events", title: "What's On", emoji: "📅", blurb: "Regular meetups & this week's events." },
  { id: "around", title: "Getting Around", emoji: "🚐", blurb: "Rides, airport runs & buses." },
  { id: "work", title: "Work", emoji: "💻", blurb: "Coworking & coliving." },
  { id: "fly", title: "Fly", emoji: "🪂", blurb: "Paragliding sites & conditions." },
  { id: "guides", title: "Guides & Links", emoji: "🧭", blurb: "Getting-started resources." },
];

// --- Community WhatsApp groups (names verified from the community; add real invite links) ---
export const GROUPS: LinkItem[] = [
  { name: "Good Morning Bansko (main daily chat)" },
  { name: "Bansko Social 2026" },
  { name: "Together Bansko (events & announcements)" },
  { name: "Bansko Cold Plunge 🥶" },
  { name: "Bansko Lindy Hop 🕺" },
  { name: "Padel Bansko 🎾" },
  { name: "Sunday Bachateros (dance socials)" },
  { name: "Central BG Paragliding Pilots 🪂" },
];

// --- Recurring / sample events (replace with a live feed) ---
export const EVENTS: EventItem[] = [
  { title: "Cold plunge", when: "Most mornings", where: "River spot", tag: "wellness" },
  { title: "Lindy Hop taster", when: "Weekly · 19:00", where: "Hanumam Yoga Studio, Cedar Lodge 3", tag: "dance" },
  { title: "Sunday bachata picnic", when: "Sundays · 14:00", where: "City Park", tag: "dance" },
  { title: "Padel", when: "Times in the group", where: "Bansko courts", tag: "sport" },
  { title: "Group run", when: "Most days", where: "Meet in town", tag: "sport" },
  { title: "Vihren Peak / Eye Lake hike", when: "Weekends (weather)", where: "From the bus station", tag: "outdoors" },
];

// --- Getting around ---
export const TRANSPORT: LinkItem[] = [
  { name: "Bansko Ride-sharing (shared sheet)", note: "Coordinate lifts & costs" },
  { name: "Airport transfers — Sofia (SOF)", note: "~2.5–3 h · bus or shared car" },
  { name: "Airport transfers — Plovdiv (PDV)", note: "~2.5 h" },
  { name: "Bus: Bansko ⇄ Sofia / Plovdiv", note: "Daily; check the bus station" },
];

// --- Work ---
export const WORK: LinkItem[] = [
  { name: "Nestwork Coworking", note: "Day passes & memberships", href: "https://nestwork.bg" },
  { name: "Coliving Bansko", note: "Coworking + community events" },
];

// --- Paragliding ---
export const FLY: LinkItem[] = [
  { name: "Bansko / Predela launch", note: "Classic local site" },
  { name: "Dobrinishte", note: "Nearby alternative" },
  { name: "Conditions", note: "Wind & thermals — wire a live weather widget here" },
];

// --- Guides ---
export const GUIDES: LinkItem[] = [
  { name: "Bansko Nomad Guide", note: "Community-maintained getting-started doc" },
];
