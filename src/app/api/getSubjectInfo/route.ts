import axios, { AxiosError } from "axios";
import { JSDOM } from "jsdom";
import { Assessment, AssessmentSet, SearchResult, Subject } from "../../types/types";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const request = await req.json();

  const result = await getSubjectInfo(request);

  if (!result.subject) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.subject);
}

async function fetchSubjectPage(url: string): Promise<Document | null> {
  try {
    const res = await axios.get(url, { timeout: 15000 });
    return new JSDOM(res.data).window.document;
  } catch (error) {
    // look for this line in Vercel > Logs: a status like 403/404, or a code like ECONNABORTED
    const e = error as AxiosError;
    console.error(`Handbook request failed (${e.response?.status ?? e.code}): ${url}`);
    return null;
  }
}

function extractData(document: Document) {
  let assessmentSets: Array<AssessmentSet> = [];
  let studyPeriodTitles = document.querySelectorAll(".assessment-table > h3");
  let studyPeriods: Array<string | null> = [];
  studyPeriodTitles.forEach((title) => {
    studyPeriods.push(title.textContent);
  });

  if (studyPeriods.length == 0) {
    studyPeriods = ["none"];
  }
  const assessmentTable = document.querySelectorAll(".assessment-details");

  assessmentTable.forEach((assessmentTable, index) => {
    assessmentSets.push({
      period: studyPeriods[index] ?? "none",
      assessments: getAssessments(assessmentTable),
    });
  });

  return assessmentSets;
}

function getAssessments(table: Element): Array<Assessment> {
  const assessmentItems: Array<Assessment> = [];
  const subjectInfo = table?.querySelectorAll("tbody tr");
  let totalWeight = 0;
  subjectInfo?.forEach((assessment) => {
    if (assessment.querySelectorAll("td").length < 3) return;
    const assessmentItem = parseAssessment(assessment);
    if (totalWeight <= 100 - assessmentItem.weight) {
      assessmentItems.push(assessmentItem);
      totalWeight += assessmentItem.weight;
    }
  });
  return assessmentItems;
}

function extractCredits(document: Document) {
  const creditTitle = document.querySelector(".header--course-and-subject__details")?.querySelectorAll("span");
  const creditString = creditTitle && creditTitle.length > 1 ? creditTitle[1].innerHTML.split(" ") : ["12.5"];
  const credits = parseFloat(creditString[creditString.length - 1]);
  return isNaN(credits) ? 12.5 : credits;
}

function parseAssessment(tableRow: Element): Assessment {
  const fields = tableRow.querySelectorAll("td");
  let hurdle = fields[0].textContent?.includes("Hurdle") ? true : false;
  let title: string = parseTitle(fields[0].querySelector("p") ?? fields[0]);
  let weight: number = parseInt(fields[2].innerHTML.slice(0, -1));
  if (isNaN(weight)) {
    weight = 0;
  }
  let assessmentItem: Assessment = {
    title: title,
    weight: weight,
    hurdle: hurdle,
    score: 0,
    completed: false,
  };
  return assessmentItem;
}

function parseTitle(title: Element): string {
  let text = title.textContent;
  let sentences = text?.split(".") ?? "none";
  return sentences[0];
}

async function getSubjectInfo(
  subject: SearchResult
): Promise<{ subject?: Subject; error?: string; status?: number }> {
  const year = new Date().getFullYear();
  const assessmentUrl = `https://handbook.unimelb.edu.au/${year}/subjects/${subject.code}/assessment`;
  const overviewUrl = `https://handbook.unimelb.edu.au/${year}/subjects/${subject.code}`;
  const [subjectOverview, assessmentPage] = await Promise.all([
    fetchSubjectPage(overviewUrl),
    fetchSubjectPage(assessmentUrl),
  ]);

  if (!assessmentPage) {
    return {
      status: 502,
      error: `Couldn't reach the handbook to load ${subject.code}. Please try again.`,
    };
  }

  const assessmentSets = extractData(assessmentPage).filter((set) => set.assessments.length > 0);
  if (assessmentSets.length === 0) {
    return {
      status: 404,
      error: `No assessments are listed for ${subject.code} in the ${year} handbook.`,
    };
  }

  const credits = subjectOverview ? extractCredits(subjectOverview) : 12.5;
  return {
    subject: {
      name: subject.name,
      code: subject.code,
      activeStudyPeriod: 0,
      assessmentSets: assessmentSets,
      credits: credits,
      targetScore: 50,
    },
  };
}
