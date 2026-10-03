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
    description:
      "The registration page goes live with domains, problem statements and how to submit your proposal.",
    date: "5th Oct",
    phase: REG,
  },
  {
    title: "Registrations Close",
    description:
      "Registration closes at 11:59 PM. The proposal submission form is shared right after.",
    date: "6th Oct",
    phase: REG,
  },
  {
    title: "Registration & Grand Opening",
    description:
      "Check in from 8:00 AM, then the Grand Opening at the Auditorium at 8:30 AM.",
    date: "08:00 AM",
    phase: DAY1,
  },
  {
    title: "Hacking Begins",
    description:
      "Teams work on their problem statements in the VESIT Library, with lunch from 1:30 PM.",
    date: "09:30 AM",
    phase: DAY1,
  },
  {
    title: "Mentoring Sessions",
    description:
      "Mentors review your progress from 2:30 PM. Teams then head home and keep working.",
    date: "02:30 PM",
    phase: DAY1,
  },
  {
    title: "Final Submission & Shortlisting",
    description:
      "Push your code and presentation by 8:30 PM. The SYRUS team evaluates, and shortlisted teams are emailed by midnight.",
    date: "08:30 PM",
    phase: DAY1,
  },
  {
    title: "Shortlisted Teams Report",
    description:
      "Shortlisted teams arrive at 8:30 AM, then refine and optimise until 12:30 PM.",
    date: "08:30 AM",
    phase: DAY2,
  },
  {
    title: "Final Submission",
    description: "Push your final code and presentation by 12:30 PM. Lunch follows.",
    date: "12:30 PM",
    phase: DAY2,
  },
  {
    title: "Judging Round",
    description: "Present and demo to the judges, then students head home.",
    date: "01:30 PM",
    phase: DAY2,
  },
  {
    title: "Result Declaration & Prizes",
    description: "Results and prize distribution. Time to be decided.",
    date: "TBA",
    phase: DAY2,
  },
];

export default timelineEvents;
