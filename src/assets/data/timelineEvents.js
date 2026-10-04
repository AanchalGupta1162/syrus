// SYRUS 7.0 timeline. Edit this list to change the timeline section.
// Each entry: { title, description, date, time?, phase }
//   date  - the day, shown large on the card ("5 Oct")
//   time  - optional, shown next to the date ("8:30 AM – 1:30 PM"); leave out for all-day entries
//   phase - small label on the card ("Registrations", "Day 01", ...)
// Keep this list the same length as galaxies.js and shipModels.js (one stop each).
const REG = "Registrations";
const DAY1 = "Day 01";
const DAY2 = "Day 02";

const timelineEvents = [
  {
    title: "Registrations Open",
    description: "Registrations go live. Form your team and apply to take part in Syrus 7.0.",
    date: "5 Oct",
    phase: REG,
  },
  {
    title: "Registrations Close & PS Allotment",
    description: "Registrations close and problem statements are allotted to the teams.",
    date: "6 Oct",
    phase: REG,
  },
  {
    title: "POC Submission & Day 1 Shortlisting",
    description: "Submit your proof of concept. The teams shortlisted for Day 1 are announced.",
    date: "7 Oct",
    phase: "Shortlisting",
  },
  {
    title: "Grand Opening & Coding Period",
    description: "Syrus 7.0 kicks off with the Grand Opening, followed by the first coding period.",
    date: "9 Oct",
    time: "8:30 AM - 1:30 PM",
    phase: DAY1,
  },
  {
    title: "Lunch",
    description: "A break to eat and recharge before the mentoring round.",
    date: "9 Oct",
    time: "1:30 PM - 2:30 PM",
    phase: DAY1,
  },
  {
    title: "Mentoring Round & Submission",
    description: "Mentors review your progress, then teams make their Day 1 submission.",
    date: "9 Oct",
    time: "2:30 PM - 4:30 PM",
    phase: DAY1,
  },
  {
    title: "Day 2 Shortlist Announced",
    description: "The teams shortlisted to move on to Day 2 are announced.",
    date: "9 Oct",
    time: "11:59 PM",
    phase: DAY1,
  },
  {
    title: "Coding Period & Final Submission",
    description: "Shortlisted teams keep building and make their final submission.",
    date: "10 Oct",
    time: "8:30 AM - 12:30 PM",
    phase: DAY2,
  },
  {
    title: "Lunch",
    description: "A break to eat and recharge before judging begins.",
    date: "10 Oct",
    time: "12:30 PM - 1:30 PM",
    phase: DAY2,
  },
  {
    title: "Judging Round",
    description: "Teams present and demo their projects to the judges.",
    date: "10 Oct",
    time: "1:30 PM - 4:30 PM",
    phase: DAY2,
  },
];

export default timelineEvents;
