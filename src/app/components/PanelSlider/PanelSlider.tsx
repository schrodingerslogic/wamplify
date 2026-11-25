import React, { useEffect } from "react";
import { useState } from "react";
import slider from "./slider.module.css";
import Wamplifier from "../Wamplifier/Wamplifier";
import SemesterHeader from "../SemesterHeader/SemesterHeader";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Mousewheel } from "swiper/modules";
import "swiper/css";
import AddIcon from "@mui/icons-material/Add";
import Wamometer from "../Wamometer/Wamometer";
import {
  subjectsAtom,
  addSubjectAtom,
  removeSubjectAtom,
  semestersAtom,
  defaultSemesters,
  resolveSemesterId,
  addSemesterAtom,
  updateSemesterAtom,
  removeSemesterAtom,
} from "@/app/types/store";
import { useAtom } from "jotai";
import { isValidUnits, isValidWam } from "@/app/lib/functions/inputValidation";
import {
  getSubjectCredits,
  getSubjectScore,
  isSubjectComplete,
} from "@/app/lib/functions/subjectCompletion";

function PanelSlider() {
  const CREDITS_PER_UNIT = 12.5;
  const [mobile, setMobile] = useState(false);
  const [shortScreen, setShortScreen] = useState(false);
  const [subjectList] = useAtom(subjectsAtom);
  const [storedSemesters] = useAtom(semestersAtom);
  const [, addSubject] = useAtom(addSubjectAtom);
  const [, deleteSubject] = useAtom(removeSubjectAtom);
  const [, addSemester] = useAtom(addSemesterAtom);
  const [, updateSemester] = useAtom(updateSemesterAtom);
  const [, deleteSemester] = useAtom(removeSemesterAtom);

  // never render with zero semesters
  const semesters =
    storedSemesters.length > 0 ? storedSemesters : defaultSemesters;

  const removeSubject = (id: string) => {
    deleteSubject(id);
  };

  // The "Current WAM" + "Subjects" boxes describe subjects finished before you
  // started using the app. If either is blank/invalid they count as nothing.
  const getPriorCompleted = (currWam: string, unitsCompleted: string) => {
    const valid = isValidWam(currWam) && isValidUnits(unitsCompleted);
    const credits = valid ? parseInt(unitsCompleted) * CREDITS_PER_UNIT : 0;
    return { credits, points: valid ? parseFloat(currWam) * credits : 0 };
  };

  // Completed subjects count at their final mark, the rest at their target.
  // Minimised semesters still count.
  const getWamPrediction = (currWam: string, unitsCompleted: string) => {
    const prior = getPriorCompleted(currWam, unitsCompleted);
    let points = prior.points;
    let credits = prior.credits;
    subjectList.forEach((subject) => {
      points += getSubjectCredits(subject) * getSubjectScore(subject);
      credits += getSubjectCredits(subject);
    });
    const wam = points / credits;
    return (Number.isFinite(wam) ? wam : 0).toFixed(2);
  };

  // WAM so far: the typed WAM/subjects plus subjects marked as completed
  const getCompletedSummary = (currWam: string, unitsCompleted: string) => {
    const prior = getPriorCompleted(currWam, unitsCompleted);
    let points = prior.points;
    let credits = prior.credits;
    subjectList.filter(isSubjectComplete).forEach((subject) => {
      points += getSubjectCredits(subject) * getSubjectScore(subject);
      credits += getSubjectCredits(subject);
    });
    return {
      credits,
      units: credits / CREDITS_PER_UNIT,
      wam: credits > 0 ? points / credits : 0,
    };
  };

  const getCreditsInProgress = () =>
    subjectList
      .filter((subject) => !isSubjectComplete(subject))
      .reduce((total, subject) => total + getSubjectCredits(subject), 0);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 800) {
        setMobile(true);
      } else {
        setMobile(false);
      }
      // phones turned sideways are wide but very short
      setShortScreen(window.innerHeight < 500);
    }

    window.addEventListener("resize", handleResize);

    handleResize();

    // unsubscribe on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // PC and tablet: the Wamometer sits in a fixed sidebar on the left and only
  // the subjects scroll. Phones keep it as the first slide.
  const stickyWamometer = !mobile && !shortScreen;
  const wamometerPanel = (
    <Wamometer
      calcPredictedWam={getWamPrediction}
      calcCompleted={getCompletedSummary}
      creditsInProgress={getCreditsInProgress()}
    />
  );

  // one header slide per semester, then its subjects and an "add subject"
  // button. A minimised semester only shows its header.
  const semesterSlides = semesters.flatMap((semester) => {
    const semesterSubjects = subjectList.filter(
      (subject) => resolveSemesterId(subject, semesters) === semester.id
    );
    const credits = semesterSubjects.reduce(
      (total, subject) => total + subject.credits,
      0
    );

    const slides = [
      <SwiperSlide key={`${semester.id}-header`} className={slider.swiperSlide}>
        <SemesterHeader
          semester={semester}
          subjectCount={semesterSubjects.length}
          credits={credits}
          canDelete={semesters.length > 1}
          onToggle={() =>
            updateSemester({ ...semester, collapsed: !semester.collapsed })
          }
          onRename={(name) => updateSemester({ ...semester, name })}
          onDelete={() => deleteSemester(semester.id)}
        />
      </SwiperSlide>,
    ];

    if (!semester.collapsed) {
      semesterSubjects.forEach((subject, index) => {
        slides.push(
          <SwiperSlide
            key={subject.id ?? `${semester.id}-${index}`}
            className={slider.swiperSlide}
          >
            <Wamplifier subject={subject} onDelete={removeSubject} />
          </SwiperSlide>
        );
      });

      slides.push(
        <SwiperSlide key={`${semester.id}-add`} className={slider.swiperSlide}>
          <div
            className={`${slider.addContainer} ${
              subjectList.length === 0 && semester.id === semesters[0].id
                ? slider.promptAdd
                : ""
            }`}
          >
            <button
              onClick={() => addSubject(semester.id)}
              className={slider.add + " swiper-no-swiping"}
              title={`Add a subject to ${semester.name}`}
            >
              <AddIcon fontSize="large" />
            </button>
          </div>
        </SwiperSlide>
      );
    }

    return slides;
  });

  return (
    <div
      className={`${slider.container} ${
        stickyWamometer ? slider.withSidebar : ""
      }`}
    >
      {stickyWamometer && (
        <div className={slider.sidebar}>{wamometerPanel}</div>
      )}

      <Swiper
        slidesPerView={"auto"}
        spaceBetween={0}
        grabCursor={true}
        centeredSlides={mobile}
        freeMode={!mobile}
        preventClicks={false}
        modules={[FreeMode, Mousewheel]}
        cssMode={mobile}
        mousewheel={{ forceToAxis: true }}
        className={slider.swiper}
      >
        {!stickyWamometer && (
          <SwiperSlide className={slider.swiperSlide}>
            {wamometerPanel}
          </SwiperSlide>
        )}

        {semesterSlides}

        <SwiperSlide className={slider.swiperSlide}>
          <div
            className={slider.addContainer}
            style={{ flexDirection: "column", gap: "1rem" }}
          >
            <button
              onClick={() => addSemester()}
              className={slider.add + " swiper-no-swiping"}
              title="Add a semester"
            >
              <AddIcon fontSize="large" />
            </button>
            <span style={{ color: "var(--n300)", fontWeight: 600 }}>
              Add semester
            </span>
          </div>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}

export default PanelSlider;
