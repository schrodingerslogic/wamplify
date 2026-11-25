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

function PanelSlider() {
  const CREDITS_PER_UNIT = 12.5;
  const [mobile, setMobile] = useState(false);
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

  // collapsed semesters still count towards the WAM prediction
  const getWamPrediction = (currWam: string, unitsCompleted: string) => {
    let totalPoints =
      parseFloat(currWam) * parseInt(unitsCompleted) * CREDITS_PER_UNIT;
    subjectList.forEach((subject) => {
      totalPoints += subject.credits * subject!.targetScore;
    });
    let totalCredits =
      parseInt(unitsCompleted) * CREDITS_PER_UNIT + getCreditsInProgress();
    return (
      isNaN(totalPoints / totalCredits) ? 0 : totalPoints / totalCredits
    ).toFixed(2);
  };

  const getCreditsInProgress = () => {
    let credits = 0;
    subjectList.forEach((subject) => (credits += subject.credits));
    return credits;
  };

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 800) {
        setMobile(true);
      } else {
        setMobile(false);
      }
    }

    window.addEventListener("resize", handleResize);

    handleResize();

    // unsubscribe on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    <div className={slider.container}>
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
        <SwiperSlide className={slider.swiperSlide}>
          <Wamometer
            calcPredictedWam={getWamPrediction}
            creditsInProgress={getCreditsInProgress()}
          />
        </SwiperSlide>

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