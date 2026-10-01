// SYRUS 7.0 timeline. Edit this list to change the timeline section.
// Each entry: { title, description, date, phase }
//   date  - shown large on the card (a day or a time; use "TBA" if unknown)
//   phase - small label on the card ("Registrations", "Day 01 · 9th Oct", ...)
const REG = "Registrations";
const DAY1 = "Day 01 · 9th Oct";
const DAY2 = "Day 02 · 10th Oct";

const timelineEvents = [
  {
    title: "Registrations Open",
    description: "Form your team of 2-4 and register on Unstop.",
    date: "5th Oct",
    phase: REG,
  },
  {
    title: "Registrations Close",
    description: "Last day to lock in your team.",
    date: "8th Oct",
    phase: REG,
  },
  {
    title: "Hackathon Begins",
    description:
      "Onboarding starts at 8:30 AM; the hackathon officially kicks off at 9:30 AM.",
    date: "08:30 AM",
    phase: DAY1,
  },
  {
    title: "Problem Statements Revealed",
    description: "Problem statements for every track go live.",
    date: "10:00 AM",
    phase: DAY1,
  },
  {
    title: "Mentoring Round 01",
    description:
      "Technical mentors review your progress and provide valuable feedback.",
    date: "02:30 PM",
    phase: DAY1,
  },
  {
    title: "Submissions",
    description: "Submit your code for the day.",
    date: "06:00 PM",
    phase: DAY1,
  },
  {
    title: "Shortlisting Round 02",
    description: "Find out if you are shortlisted for Day 02.",
    date: "11:59 PM",
    phase: DAY1,
  },
  {
    title: "Day 02 Begins",
    description: "Finalists arrive and coding resumes.",
    date: "08:30 AM",
    phase: DAY2,
  },
  {
    title: "Judging Round",
    description: "Final presentations and demos to the judges.",
    date: "02:30 PM",
    phase: DAY2,
  },
  {
    title: "Closing Ceremony & Prize Distribution",
    description: "",
    date: "TBA",
    phase: DAY2,
  },
];

export default timelineEvents;
