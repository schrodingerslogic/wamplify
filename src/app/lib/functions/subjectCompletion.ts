import { Assessment, Subject } from "@/app/types/types";
import { getMaxScore } from "./subjectScoreCalculations";

// anything that isn't a real number counts as 0, so bad data can't break the WAM
const finite = (value: unknown): number =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

// the assessments of whichever study period is currently selected
export function getActiveAssessments(subject: Subject): Assessment[] {
  const set =
    subject.assessmentSets?.[subject.activeStudyPeriod] ??
    subject.assessmentSets?.[0];
  return set?.assessments ?? subject.assessments ?? [];
}

// true once every weighted assessment (including the final exam) has a mark
export function isAutoComplete(subject: Subject): boolean {
  const weighted = getActiveAssessments(subject).filter((a) => a.weight > 0);
  return weighted.length > 0 && weighted.every((a) => a.completed);
}

// completed = ticked by hand OR every weighted assessment has a mark
export function isSubjectComplete(subject: Subject): boolean {
  return subject.completed === true || isAutoComplete(subject);
}

// true when the student typed their own final mark for a hand-ticked subject
export function hasManualFinalMark(subject: Subject): boolean {
  return (
    subject.completed === true &&
    !isAutoComplete(subject) &&
    subject.finalMark !== undefined &&
    Number.isFinite(Number(subject.finalMark))
  );
}

// The mark that counts towards your WAM:
//  - all marks entered   -> the calculated final mark (rounded, like the uni does)
//  - ticked + final mark -> the final mark you typed in
//  - otherwise           -> the target score
export function getSubjectScore(subject: Subject): number {
  if (isAutoComplete(subject)) {
    return Math.round(finite(getMaxScore(getActiveAssessments(subject))));
  }
  if (hasManualFinalMark(subject)) {
    return Math.min(100, Math.max(0, finite(subject.finalMark)));
  }
  return finite(subject.targetScore);
}

export function getSubjectCredits(subject: Subject): number {
  return finite(subject.credits);
}
