import React from "react";
import wamometer from "./wamometer.module.css";
import WamometerThermo from "./WamometerThermo";
import HelpIcon from "@mui/icons-material/InfoRounded";
import { isValidUnits, isValidWam } from "@/app/lib/functions/inputValidation";
import { currentWam, unitsCompleted } from "@/app/types/store";
import { useAtom } from "jotai/react";

const formatUnits = (units: number) => String(Number(units.toFixed(2)));

function Wamometer({
  calcPredictedWam,
  calcCompleted,
  creditsInProgress,
}: {
  calcPredictedWam: Function;
  calcCompleted: Function;
  creditsInProgress: number;
}) {
  const [currWam, setCurrWam] = useAtom(currentWam);
  const [units, setUnits] = useAtom(unitsCompleted);
  const active = parseFloat(calcPredictedWam(currWam, units)) > 0;

  // everything finished so far: what you typed + subjects completed in the app
  const completed: { credits: number; units: number; wam: number } =
    calcCompleted(currWam, units);

  function handleWamChange(e: React.SyntheticEvent) {
    let input = e.target as HTMLInputElement;
    setCurrWam(input.value);
  }

  function handleCreditChange(e: React.SyntheticEvent) {
    let input = e.target as HTMLInputElement;
    setUnits(input.value);
  }

  function getWamDiff() {
    // change compared with your WAM so far
    const diff =
      completed.credits > 0
        ? calcPredictedWam(currWam, units) - completed.wam
        : 0;
    // round first so float noise doesn't show up as "-0.00"
    return (Math.round(diff * 100) / 100).toFixed(2);
  }

  function getWamStateName() {
    if (!isValidWam(currWam) && currWam != "") {
      return wamometer.invalid;
    }
  }

  function getUnitsStateName() {
    if (!isValidUnits(units) && units != "") {
      return wamometer.invalid;
    }
  }

  return (
    <div className={wamometer.body + " panel"}>
      <div className={wamometer.title}>Your Wamometer</div>

      {active && (
        <WamometerThermo
          markerSteps={20}
          value={calcPredictedWam(currWam, units)}
        />
      )}

      {!active && <WamometerThermo markerSteps={20} value={0} />}

      <div className={wamometer.wamContainer}>
        <div className={`${wamometer.wam} ${active ? "" : wamometer.disabled}`}>
          <p className={wamometer.wamDiff}>{getWamDiff()} change</p>
          <p className={wamometer.wamScore}>
            {calcPredictedWam(currWam, units)}
          </p>
        </div>
      </div>

      <div className={wamometer.footer}>
        <div className={wamometer.tip}>
          <div className={wamometer.tipTitle}>
            What does this mean? <HelpIcon />
          </div>
          <div className={wamometer.tooltip}>
            <div className={wamometer.tipTitle}>
              What does this mean? <HelpIcon />
            </div>
            <div>
              Enter the WAM and number of subjects you finished
              <strong> before using Wamplify</strong> (ones that aren&apos;t in
              a panel). Subjects you complete here are added to the
              <strong> Current</strong> row automatically. 25-credit subjects
              count as two subjects!
            </div>
          </div>
        </div>

        <div className={wamometer.table}>
          <span />
          <span className={wamometer.colHead}>WAM</span>
          <span className={wamometer.colHead}>Subjects</span>

          <span className={wamometer.rowLabel}>Before Wamplify</span>
          <input
            aria-label="WAM before Wamplify"
            value={currWam}
            onChange={(e) => handleWamChange(e)}
            className={getWamStateName()}
          />
          <input
            aria-label="Subjects completed before Wamplify"
            value={units}
            onChange={(e) => handleCreditChange(e)}
            className={getUnitsStateName()}
          />

          <span className={wamometer.rowLabel}>Current</span>
          <output className={wamometer.readout} aria-label="Current WAM">
            {completed.credits > 0 ? completed.wam.toFixed(2) : "–"}
          </output>
          <output className={wamometer.readout} aria-label="Current subjects">
            {completed.credits > 0 ? formatUnits(completed.units) : "–"}
          </output>
        </div>

        <p className={wamometer.points}>
          {completed.credits} credits complete, {creditsInProgress} in progress.
        </p>
      </div>
    </div>
  );
}

export default Wamometer;
