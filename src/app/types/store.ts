import { atomWithStorage } from "jotai/utils";
import { Semester, Subject } from "./types";
import { atom } from "jotai";
import generateID from "../lib/functions/generateId";

// simple atoms for wamometer
export const currentWam = atomWithStorage("currentWam", "");
export const unitsCompleted = atomWithStorage("unitsCompleted", "");

// semester sections (saved in localStorage, like everything else here)
export const DEFAULT_SEMESTER_ID = "default";
export const defaultSemesters: Semester[] = [
  { id: DEFAULT_SEMESTER_ID, name: "Semester 1", collapsed: false },
];
export const semestersAtom = atomWithStorage<Semester[]>(
  "semesters",
  defaultSemesters
);

// Subjects saved before semesters existed (or pointing at a semester that no
// longer exists) are shown in the first semester.
export const resolveSemesterId = (
  subject: Subject,
  semesters: Semester[]
): string =>
  semesters.some((semester) => semester.id === subject.semesterId)
    ? (subject.semesterId as string)
    : semesters[0].id;

export const addSemesterAtom = atom(
  () => "",
  (get, set) => {
    const semesters = get(semestersAtom);
    set(semestersAtom, [
      ...semesters,
      {
        id: generateID(),
        name: `Semester ${semesters.length + 1}`,
        collapsed: false,
      },
    ]);
  }
);

export const updateSemesterAtom = atom(
  () => "",
  (get, set, updated: Semester) =>
    set(
      semestersAtom,
      get(semestersAtom).map((semester) =>
        semester.id === updated.id ? { ...updated } : semester
      )
    )
);

// removes the semester AND the subjects inside it (the UI asks to confirm)
export const removeSemesterAtom = atom(
  () => "",
  (get, set, id: string) => {
    const semesters = get(semestersAtom);
    if (semesters.length <= 1) return; // always keep one semester
    set(
      subjectsAtom,
      get(subjectsAtom).filter(
        (subject) => resolveSemesterId(subject, semesters) !== id
      )
    );
    set(
      semestersAtom,
      semesters.filter((semester) => semester.id !== id)
    );
  }
);

// subject list related atoms
// update default in sem 2
const emptySubject = {
  name: "",
  code: "",
  assessmentSets: [],
  activeStudyPeriod: 0,
  credits: 0,
  targetScore: 50,
};
export const newSubjectAtom = atom<Subject>(emptySubject);
export const subjectsAtom = atomWithStorage<Subject[]>("subjects", []);

const addSubject = (subjects: Subject[], semesterId: string): Subject[] => [
  ...subjects,
  { ...emptySubject, id: generateID(), semesterId },
];

const updateSubject = (
  subjects: Subject[],
  updatedSubject: Subject
): Subject[] =>
  subjects.map((subject) => {
    if (subject.id === updatedSubject.id) {
      return { ...updatedSubject };
    } else {
      return { ...subject };
    }
  });

const removeSubject = (subjects: Subject[], id: string): Subject[] =>
  subjects.filter((subject) => subject.id !== id);

export const addSubjectAtom = atom(
  () => "",
  (get, set, semesterId: string) => {
    set(subjectsAtom, addSubject(get(subjectsAtom), semesterId));
  }
);

export const removeSubjectAtom = atom(
  () => "",
  (get, set, id: string) => {
    set(subjectsAtom, removeSubject(get(subjectsAtom), id));
  }
);

export const updateSubjectAtom = atom(
  () => "",
  (get, set, updatedSubject: Subject) =>
    set(subjectsAtom, updateSubject(get(subjectsAtom), updatedSubject))
);