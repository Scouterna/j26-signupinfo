import { createContext, useContext } from "react";

/**
 * Holds static project configuration loaded once on startup.
 * All values come from useProjectQueries and never change during a session.
 *
 * @typedef {{
 *   projectId: number | null,
 *   statistics: string[],
 *   statisticSubQuestions: Record<string, string[]>,
 *   sectionIdToText: Record<string, string>,
 *   questionIdToText: Record<string, string>,
 *   booleanQuestionIds: Set<string>,
 *   sectionQuestions: Record<string, string[]>,
 *   questionChoices: Record<string, string[]>,
 *   groupIdToName: Record<number, string>,
 * }} ProjectConfig
 */

const ProjectConfigContext = createContext(/** @type {ProjectConfig} */ ({
  projectId: null,
  statistics: [],
  statisticSubQuestions: {},
  sectionIdToText: {},
  questionIdToText: {},
  booleanQuestionIds: new Set(),
  sectionQuestions: {},
  questionChoices: {},
  groupIdToName: {},
}));

export default ProjectConfigContext;

export function useProjectConfig() {
  return useContext(ProjectConfigContext);
}
