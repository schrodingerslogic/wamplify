import { Assessment, Subject } from "@/app/types/types";
import {
  getSubjectScore,
  hasManualFinalMark,
  isAutoComplete,
  isSubjectComplete,
} from "./subjectCompletion";

const a = (weight: number, score: number, completed: boolean): Assessment => ({
  title: "x", weight, score, completed, hurdle: false,
});
const subject = (assessments: Assessment[], extra: Partial<Subject> = {}): Subject => ({
  name: "S", code: "S", credits: 12.5, targetScore: 70, activeStudyPeriod: 0,
  assessmentSets: [{ period: "none", assessments }], ...extra,
});

describe("subject completion", () => {
  it("is not complete while a weighted assessment (e.g. the exam) has no mark", () => {
    const s = subject([a(40, 80, true), a(60, 0, false)]);
    expect(isAutoComplete(s)).toBe(false);
    expect(isSubjectComplete(s)).toBe(false);
    expect(getSubjectScore(s)).toBe(70); // falls back to the target
  });

  it("auto-completes once every weighted assessment has a mark, using the real final mark", () => {
    const s = subject([a(40, 80, true), a(60, 90, true)]);
    expect(isAutoComplete(s)).toBe(true);
    expect(isSubjectComplete(s)).toBe(true);
    expect(getSubjectScore(s)).toBe(86); // 32 + 54, not the 70 target
  });

  it("rounds the calculated final mark to a whole number", () => {
    const s = subject([a(30, 85, true), a(10, 85, true), a(60, 85, true)]);
    expect(getSubjectScore(s)).toBe(85);
    const t = subject([a(50, 85, true), a(50, 84, true)]); // 84.5
    expect(getSubjectScore(t)).toBe(85);
  });

  it("ignores no-weight hurdle rows when deciding", () => {
    const s = subject([a(100, 75, true), a(0, 0, false)]);
    expect(isAutoComplete(s)).toBe(true);
  });

  it("hand-ticked without a final mark falls back to the target", () => {
    const s = subject([a(40, 80, true), a(60, 0, false)], { completed: true });
    expect(isSubjectComplete(s)).toBe(true);
    expect(hasManualFinalMark(s)).toBe(false);
    expect(getSubjectScore(s)).toBe(70);
  });

  it("hand-ticked with a typed final mark uses that mark instead of the target", () => {
    const s = subject([a(40, 80, true), a(60, 0, false)], { completed: true, finalMark: 91 });
    expect(hasManualFinalMark(s)).toBe(true);
    expect(getSubjectScore(s)).toBe(91);
  });

  it("a typed final mark is ignored if the subject isn't ticked, or once all marks are in", () => {
    const unticked = subject([a(60, 0, false)], { finalMark: 91 });
    expect(getSubjectScore(unticked)).toBe(70);
    const allIn = subject([a(40, 80, true), a(60, 90, true)], { completed: true, finalMark: 50 });
    expect(getSubjectScore(allIn)).toBe(86); // calculated mark wins
  });

  it("clamps a typed final mark to 0-100 and never returns NaN", () => {
    expect(getSubjectScore(subject([a(100, 0, false)], { completed: true, finalMark: 400 }))).toBe(100);
    expect(getSubjectScore(subject([a(100, 0, false)], { targetScore: NaN }))).toBe(0);
  });
});
