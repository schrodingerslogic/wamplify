import React from "react";
import styles from "./semesterHeader.module.css";
import { Semester } from "@/app/types/types";

function SemesterHeader({
  semester,
  subjectCount,
  credits,
  canDelete,
  onToggle,
  onRename,
  onDelete,
}: {
  semester: Semester;
  subjectCount: number;
  credits: number;
  canDelete: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const rename = () => {
    const name = window.prompt("Rename this semester", semester.name);
    if (name && name.trim() !== "") onRename(name.trim());
  };

  const remove = () => {
    if (
      window.confirm(
        `Delete "${semester.name}" and the ${subjectCount} subject(s) in it?`
      )
    ) {
      onDelete();
    }
  };

  return (
    <div className={`${styles.header} panel`}>
      <button
        className={`${styles.name} swiper-no-swiping`}
        onClick={rename}
        title="Click to rename"
      >
        {semester.name}
      </button>

      <div className={styles.meta}>
        {subjectCount} subject{subjectCount === 1 ? "" : "s"} · {credits}{" "}
        credits
      </div>

      <div className={styles.actions}>
        <button className={`${styles.button} swiper-no-swiping`} onClick={onToggle}>
          {semester.collapsed ? "Expand ▸" : "◂ Minimise"}
        </button>
        {canDelete && (
          <button
            className={`${styles.button} ${styles.danger} swiper-no-swiping`}
            onClick={remove}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default SemesterHeader;
