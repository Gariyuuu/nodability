export interface TemplateTask {
  title: string;
  category: string;
}

export interface StarterTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  tasks: TemplateTask[];
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "student",
    name: "Student",
    emoji: "🎓",
    description: "Classes, assignments, and extracurriculars.",
    tasks: [
      { title: "Add your class schedule", category: "Classes" },
      { title: "List this week's readings", category: "Assignments" },
      { title: "Pick a club or activity to track", category: "Extracurriculars" },
    ],
  },
  {
    id: "work",
    name: "Work",
    emoji: "💼",
    description: "Meetings, deep work, and admin.",
    tasks: [
      { title: "Block time for deep work", category: "Deep Work" },
      { title: "Prep for your next 1:1", category: "Meetings" },
      { title: "Clear out your inbox", category: "Admin" },
    ],
  },
  {
    id: "home",
    name: "Home & Life",
    emoji: "🏡",
    description: "Chores, errands, and health.",
    tasks: [
      { title: "Plan groceries for the week", category: "Errands" },
      { title: "Pick a chore to knock out today", category: "Chores" },
      { title: "Schedule a workout", category: "Health" },
    ],
  },
];

export function findTemplate(id: string): StarterTemplate | undefined {
  return STARTER_TEMPLATES.find((t) => t.id === id);
}
