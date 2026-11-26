import axios, { AxiosError } from "axios";
import { JSDOM } from "jsdom";
import { Assessment, AssessmentSet, SearchResult, Subject } from "../../types/types";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import bundledCache from "@/app/lib/handbookCache.json";

export async function POST(req: Request) {
  const request = await req.json();

  const result = await getSubjectInfo(request);

  if (!result.subject) {
    return NextResponse.json({ error: result.error, debug: result.debug }, { status: result.status });
  }

  return NextResponse.json(result.subject);
}

type FetchedPage = { document: Document | null; debug: string; blocked: boolean };

async function fetchSubjectPage(url: string): Promise<FetchedPage> {
  try {
    const res = await axios.get(url, { timeout: 15000 });
    const html = String(res.data);
    const document = new JSDOM(html).window.document;
    // the handbook sits behind Imperva Incapsula, which answers servers it doesn't trust with a
    // challenge page (HTTP 200, no subject content)
    const blocked = html.includes("_Incapsula_Resource");
    const debug = `HTTP ${res.status}, ${html.length} bytes, title "${document.title.trim().slice(0, 60)}"${
      blocked ? ", Incapsula bot-protection page" : ""
    }`;
    if (blocked) console.error(`Handbook blocked this server (Incapsula): ${url}`);
    return { document, debug, blocked };
  } catch (error) {
    // look for this line in Vercel > Logs: a status like 403/404, or a code like ECONNABORTED
    const e = error as AxiosError;
    const reason = e.response?.status ?? e.code;
    console.error(`Handbook request failed (${reason}): ${url}`);
    return { document: null, debug: `request failed (${reason})`, blocked: false };
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

type LookupResult = { subject?: Subject; error?: string; status?: number; debug?: string };

// Saved subject data. On your own computer (npm run dev) every subject that loads from the handbook is
// saved to this file; once it's committed, the deployed site can serve those subjects without the handbook.
const CACHE_PATH =
  process.env.HANDBOOK_CACHE_PATH ?? path.join(process.cwd(), "src/app/lib/handbookCache.json");
const isDev = () => process.env.NODE_ENV === "development";

function readCache(): Record<string, Subject> {
  if (isDev()) {
    try {
      return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    } catch {
      return {};
    }
  }
  return bundledCache as unknown as Record<string, Subject>;
}

function saveToCache(key: string, subject: Subject) {
  if (!isDev()) return;
  try {
    const cache = readCache();
    cache[key] = subject;
    const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(CACHE_PATH, JSON.stringify(sorted, null, 2) + "\n");
  } catch (error) {
    console.error("Couldn't save subject to handbookCache.json", error);
  }
}

async function fetchFromHandbook(subject: SearchResult, year: number): Promise<LookupResult> {
  const assessmentUrl = `https://handbook.unimelb.edu.au/${year}/subjects/${subject.code}/assessment`;
  const overviewUrl = `https://handbook.unimelb.edu.au/${year}/subjects/${subject.code}`;
  const [subjectOverview, assessmentPage] = await Promise.all([
    fetchSubjectPage(overviewUrl),
    fetchSubjectPage(assessmentUrl),
  ]);

  if (assessmentPage.blocked) {
    return {
      status: 503,
      error: `The Unimelb handbook blocks live lookups from this server, and ${subject.code} isn't saved on this site yet.`,
      debug: assessmentPage.debug,
    };
  }

  if (!assessmentPage.document) {
    return {
      status: 502,
      error: `Couldn't reach the handbook to load ${subject.code}. Please try again.`,
      debug: assessmentPage.debug,
    };
  }

  const assessmentSets = extractData(assessmentPage.document).filter((set) => set.assessments.length > 0);
  if (assessmentSets.length === 0) {
    return {
      status: 404,
      error: `No assessments are listed for ${subject.code} in the ${year} handbook.`,
      debug: assessmentPage.debug,
    };
  }

  const credits = subjectOverview.document ? extractCredits(subjectOverview.document) : 12.5;
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

async function getSubjectInfo(subject: SearchResult): Promise<LookupResult> {
  const year = new Date().getFullYear();
  const key = `${year}/${subject.code.toUpperCase()}`;

  // deployed site: saved data first (the handbook blocks servers)
  if (!isDev()) {
    const saved = readCache()[key];
    if (saved) return { subject: saved };
  }

  const live = await fetchFromHandbook(subject, year);
  if (live.subject) {
    saveToCache(key, live.subject);
    return live;
  }

  // on your computer, fall back to saved data if the handbook can't be reached
  const saved = readCache()[key];
  if (saved) return { subject: saved };

  return live;
}
