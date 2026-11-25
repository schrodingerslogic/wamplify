import React, { useState } from "react";
import axios from "axios";
import wamplifier from "./wamplifier.module.css";
import Divider from "../Divider/Divider";
import AssessmentInput from "./Assessment/Assessment";
import Slider from "@mui/material/Slider";
import CloseIcon from "@mui/icons-material/Close";
import { Assessment, SearchResult, Subject } from "@/app/types/types";
import SubjectSearch from "./SubjectSearch/SubjectSearch";
import {
  calculateSubjectAverage,
  getMaxScore,
  getRemainingTarget,
} from "@/app/lib/functions/subjectScoreCalculations";
import { updateSubjectAtom } from "@/app/types/store";

import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Mousewheel } from "swiper/modules";

import "swiper/css";
import "swiper/css/free-mode";
import LoadingBox from "../LoadingBox/LoadingBox";
import { useAtom } from "jotai";
import CompleteToggle from "../CompleteToggle/CompleteToggle";
import {
  getActiveAssessments as getAssessmentsSafely,
  getSubjectScore,
  hasManualFinalMark,
  isAutoComplete,
  isSubjectComplete,
} from "@/app/lib/functions/subjectCompletion";

const sliderMarks = [
  {
    value: 50,
    label: "P",
  },
  {
    value: 65,
    label: "H3",
  },
  {
    value: 70,
    label: "H2B",
  },
  {
    value: 75,
    label: "H2A",
  },
  {
    value: 80,
    label: "H1",
  },
];

function Wamplifier({
  subject,
  onDelete,
}: {
  onDelete: Function;
  subject: Subject;
}) {
  const [, updateSubject] = useAtom(updateSubjectAtom);
  const [isLoading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const getActiveAssessmentSet = (subject: Subject) => {
    // for backwards compatibility
    if (
      subject.activeStudyPeriod === undefined ||
      subject.assessmentSets === undefined ||
      subject.assessmentSets?.length === 0
    ) {
      updateSubject({
        ...subject,
        activeStudyPeriod: 0,
        assessmentSets: [
          { period: "none", assessments: subject.assessments ?? [] },
        ],
      });

      return { period: "none", assessments: subject.assessments ?? [] };
    }

    if (subject.activeStudyPeriod > subject.assessmentSets.length - 1) {
      return subject.assessmentSets[0];
    }

    return subject.assessmentSets[subject.activeStudyPeriod];
  };

  const getActiveAssessments = (subject: Subject) => {
    return getActiveAssessmentSet(subject).assessments;
  };

  // loads subject assessments from API
  const onSubjectSelect = (subjectSelection: SearchResult) => {
    setLoading(true);
    setLoadError("");
    axios
      .post("/api/getSubjectInfo", subjectSelection)
      .then((res) => {
        if (!res.data?.assessmentSets?.length) {
          throw new Error("No assessments came back for this subject.");
        }
        updateSubject({
          ...res.data,
          id: subject.id,
          semesterId: subject.semesterId,
          targetScore: subject.targetScore,
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
        setLoadError(
          error?.response?.data?.error ??
            "Couldn't load that subject. Check your connection and try again."
        );
        document
          .querySelector(`#SubjectSearch--${subject.id} input`)
          ?.removeAttribute("disabled");
      });
  };

  // updates assessment default input based on target and current assessment
  const updateDesiredScores = (subject: Subject) => {
    let remainingTarget = getRemainingTarget(
      getActiveAssessments(subject),
      subject.targetScore
    );
    let newSubject = { ...subject };
    let weightRemaining = 100;
    getActiveAssessments(newSubject).forEach((assessment) => {
      if (assessment.completed) {
        weightRemaining -= assessment.weight;
      }
    });
    let desiredScore = (remainingTarget / weightRemaining) * 100;
    getActiveAssessments(newSubject).forEach((assessment) => {
      if (!assessment.completed && assessment.weight > 0) {
        assessment.desiredScore = Math.round(desiredScore);
      }
      if (!assessment.completed && assessment.weight == 0) {
        assessment.desiredScore = 100;
      }
    });

    return newSubject;
  };

  const complete = isSubjectComplete(subject);
  const auto = isAutoComplete(subject);

  if (
    !isLoading &&
    subject.code != "" &&
    getAssessmentsSafely(subject).length === 0
  ) {
    return (
      <div
        className={wamplifier.body + " panel"}
        id={`Wamplifier--${subject.id}`}
      >
        <div className={wamplifier.header}>
          <div className="fc">
            <h2 className={wamplifier.title}>{subject.name}</h2>
            <h3 className={wamplifier.code}>{subject.code}</h3>
          </div>
          <button className={wamplifier.close}>
            <CloseIcon fontSize="medium" onClick={() => onDelete(subject.id)} />
          </button>
        </div>

        <Divider />

        <div className={wamplifier.contentEmpty}>
          <p
            style={{
              padding: "var(--wamp-padding)",
              color: "var(--n300)",
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            {loadError ||
              `The assessments for ${subject.code} didn’t load. The handbook may not list them yet, or it couldn’t be reached.`}
          </p>
          <button
            className="swiper-no-swiping"
            onClick={() =>
              onSubjectSelect({ name: subject.name, code: subject.code })
            }
            style={{
              margin: "0 var(--wamp-padding) var(--wamp-padding)",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "1px solid var(--a500)",
              background: "none",
              color: "var(--a500)",
              fontFamily: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={wamplifier.body + " panel"}
      tabIndex={-1}
      id={`Wamplifier--${subject.id}`}
    >
      <div className={wamplifier.header}>
        {subject.name != "" && (
          <div className="fc">
            <h2 className={wamplifier.title}>{subject.name}</h2>
            <h3 className={wamplifier.code}>{subject.code}</h3>
          </div>
        )}

        {(subject.name === "" || isLoading) && (
          <SubjectSearch
            id={subject.id}
            onSelect={(subject: SearchResult) => onSubjectSelect(subject)}
          />
        )}

        <button className={wamplifier.close}>
          <CloseIcon fontSize="medium" onClick={() => onDelete(subject.id)} />
        </button>
      </div>

      <Divider />

      {(isLoading || subject.code == "") && (
        <div className={wamplifier.contentEmpty}>
          {loadError && (
            <p
              style={{
                padding: "var(--wamp-padding) var(--wamp-padding) 0",
                color: "var(--bad100)",
                fontWeight: 400,
              }}
            >
              {loadError}
            </p>
          )}
          <LoadingBox isLoading={isLoading} rows={3} />
        </div>
      )}

      {!isLoading && subject.code != "" && (
        <Swiper
          direction={"vertical"}
          slidesPerView={"auto"}
          freeMode={true}
          mousewheel={{ forceToAxis: true }}
          grabCursor={true}
          modules={[FreeMode, Mousewheel]}
          className={wamplifier.swiper}
        >
          <SwiperSlide className={wamplifier.assessmentContainer}>
            <div>
              <div className={wamplifier.currentRate}>
                <label>
                  Enter the results from your past assignments. At this rate,
                  you’ll get a...
                </label>
                <div className={wamplifier.currentScore}>
                  {Math.round(
                    calculateSubjectAverage(getActiveAssessments(subject))
                  )}
                </div>
              </div>

              <div className={wamplifier.assessments}>
                {getActiveAssessments(subject).map(
                  (assessment: Assessment, index: number) => (
                    <AssessmentInput
                      assessment={assessment}
                      highlighted={index < 2}
                      onChange={(assessment: Assessment) => {
                        let newAssessmentSets = subject.assessmentSets ?? [];
                        let newAssessments = getActiveAssessments(subject);
                        newAssessments[index] = assessment;
                        let newMax = getMaxScore(newAssessments);
                        let newTargetScore =
                          subject.targetScore > newMax
                            ? newMax
                            : subject.targetScore;
                        let completedAssessments = 0;
                        newAssessments.forEach((assessment) => {
                          if (assessment.completed) {
                            completedAssessments += 1;
                          }
                        });
                        if (completedAssessments == newAssessments.length) {
                          newTargetScore = newMax;
                        }
                        newAssessmentSets[
                          subject.activeStudyPeriod
                        ].assessments = newAssessments;
                        updateSubject(
                          updateDesiredScores({
                            ...subject,
                            targetScore: newTargetScore,
                            assessmentSets: newAssessmentSets,
                          })
                        );
                      }}
                      key={`${subject.activeStudyPeriod}-${index}`}
                      targetScore={subject.targetScore}
                    />
                  )
                )}
              </div>

              <CompleteToggle
                complete={complete}
                auto={auto}
                markEntered={hasManualFinalMark(subject)}
                onChange={(checked) =>
                  updateSubject({ ...subject, completed: checked })
                }
              />
            </div>

            {subject?.assessmentSets?.length > 1 && (
              <div className={wamplifier.studyPeriods}>
                {subject.assessmentSets.map((set, i) => (
                  <button
                    key={i}
                    className={`${wamplifier.studyPeriod} ${
                      i === subject.activeStudyPeriod
                        ? wamplifier.studyPeriodActive
                        : ""
                    } swiper-no-swiping`}
                    onClick={() =>
                      updateSubject(
                        updateDesiredScores({
                          ...subject,
                          activeStudyPeriod: i,
                        })
                      )
                    }
                  >
                    {set.period}
                  </button>
                ))}
              </div>
            )}
          </SwiperSlide>
        </Swiper>
      )}

      <Divider />

      {(isLoading || subject.code == "") && (
        <div className={wamplifier.footerEmpty}>
          <LoadingBox isLoading={isLoading} rows={1} />
        </div>
      )}

      {!isLoading && subject.code != "" && (
        <div>
          <div className={wamplifier.controls}>
            {complete ? (
              <div className={wamplifier.note}>
                {auto
                  ? "Completed. This subject counts at the final mark calculated from your results."
                  : "Completed. Enter your final mark below. It counts instead of a target score."}
              </div>
            ) : (
              <>
                <div className={wamplifier.note}>
                  Set your target score. Your incomplete assessments will
                  reflect the required scores.
                </div>

                <div className={wamplifier.slider}>
                  <Slider
                    aria-label="Target Score"
                    value={subject.targetScore}
                    step={1}
                    min={50}
                    max={getMaxScore(getActiveAssessments(subject))}
                    valueLabelDisplay="auto"
                    marks={sliderMarks}
                    className="slider swiper-no-swiping"
                    onChange={(e, value) => {
                      if (Array.isArray(value)) {
                        updateSubject(
                          updateDesiredScores({
                            ...subject,
                            targetScore: value[0],
                          })
                        );
                      } else {
                        updateSubject(
                          updateDesiredScores({
                            ...subject,
                            targetScore: value,
                          })
                        );
                      }
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <div className={wamplifier.footer}>
            <div className={wamplifier.target}>
              <div className={wamplifier.targetText}>
                {complete ? "Your final mark for" : "Your target for"}{" "}
                <span>{subject.code}</span> is
              </div>
              {complete ? (
                <input
                  value={
                    auto
                      ? getSubjectScore(subject).toFixed(0)
                      : subject.finalMark !== undefined
                        ? String(subject.finalMark)
                        : ""
                  }
                  placeholder={
                    auto ? undefined : subject.targetScore.toFixed(0)
                  }
                  readOnly={auto}
                  onChange={(e) => {
                    if (auto) return;
                    const value = e.target.value.trim();
                    if (value === "") {
                      updateSubject({ ...subject, finalMark: undefined });
                    } else if (
                      !isNaN(Number(value)) &&
                      Number(value) >= 0 &&
                      Number(value) <= 100
                    ) {
                      updateSubject({
                        ...subject,
                        finalMark: parseInt(value),
                      });
                    }
                  }}
                  onKeyDown={(e) => e.key == "Enter" && e.currentTarget.blur()}
                />
              ) : (
                <input
                  value={subject.targetScore.toFixed(0)}
                  onChange={(e) => {
                    if (
                      !isNaN(Number(e.target.value)) &&
                      Number(e.target.value) <= 100
                    ) {
                      let newTargetScore = parseInt(
                        e.target.value == "" ? "0" : e.target.value
                      );
                      updateSubject(
                        updateDesiredScores({
                          ...subject,
                          targetScore: newTargetScore,
                        })
                      );
                    }
                  }}
                  onKeyDown={(e) => e.key == "Enter" && e.currentTarget.blur()}
                  onBlur={(e) => {
                    let newTargetScore = subject.targetScore;
                    if (
                      !isNaN(Number(e.target.value)) &&
                      Number(e.target.value) <= 100
                    ) {
                      newTargetScore = parseInt(
                        e.target.value == "" ? "0" : e.target.value
                      );
                      updateSubject(
                        updateDesiredScores({
                          ...subject,
                          targetScore: newTargetScore,
                        })
                      );
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Wamplifier;
