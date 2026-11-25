import React from "react";
import styles from "./completeToggle.module.css";

function CompleteToggle({
  complete,
  auto,
  markEntered,
  onChange,
}: {
  complete: boolean;
  auto: boolean; // true when every assessment already has a mark
  markEntered: boolean; // true when a final mark was typed in for a hand-ticked subject
  onChange: (checked: boolean) => void;
}) {
  const text = auto
    ? "Completed (all marks entered)"
    : complete && !markEntered
      ? "Completed. Enter your final mark below"
      : complete
        ? "Completed"
        : "Mark as completed";

  return (
    <label
      className={`${styles.toggle} ${complete ? styles.done : ""} swiper-no-swiping`}
      title={
        auto
          ? "Every assessment has a mark, so this subject counts as completed."
          : "Tick this once the subject is finished, then enter your final mark."
      }
    >
      <input
        type="checkbox"
        checked={complete}
        disabled={auto}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{text}</span>
    </label>
  );
}

export default CompleteToggle;
