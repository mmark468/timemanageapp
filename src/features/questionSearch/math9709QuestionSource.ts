import { cieMathQuestionBank } from "./cieMathQuestionBank";
import { toExternalPaperLink } from "./externalPaperLinks";
import { math9709PaperDatabase } from "./math9709PaperDatabase";
import type { CieMathQuestion } from "./types";

export function buildMath9709QuestionSearchSource(fromYear: number): CieMathQuestion[] {
  const detailedSeedQuestions = cieMathQuestionBank
    .filter((question) => question.year >= fromYear)
    .map((question) => withExternalSeedLinks(question));
  const paperLevelEntries = math9709PaperDatabase
    .filter((paper) => paper.year >= fromYear && paper.questionPaper && paper.markScheme)
    .map((paper) => {
      const questionPaper = paper.questionPaper!;
      const markScheme = paper.markScheme!;
      const externalQuestionPaper = toExternalPaperLink(questionPaper);
      const externalMarkScheme = toExternalPaperLink(markScheme);
      const shortYear = String(paper.year).slice(-2);
      const compactSeries = `${paper.seriesCode}${shortYear}`;
      const slashSeries = paper.seriesCode === "m" ? "F/M" : paper.seriesCode === "s" ? "M/J" : "O/N";

      return {
        id: `${paper.id}-paper-index`,
        board: "CAIE",
        subjectName: "数学",
        syllabusCode: "9709",
        qualification: "AS/A Level",
        year: paper.year,
        series: paper.seriesName,
        componentCode: paper.componentCode,
        componentGroup: paper.componentGroup,
        paperLabel: paper.paperLabel,
        variant: paper.componentCode.slice(1) || paper.componentCode,
        questionNumber: "Paper",
        title: `${paper.seriesName} ${paper.year} Paper ${paper.componentCode}`,
        topic: "完整试卷",
        questionSummary: `${paper.sessionLabel} ${paper.year} Paper ${paper.componentCode} 的完整 Question Paper，已配对 QP 和 Mark Scheme。`,
        answer: "已配对 Mark Scheme；点击 MS 查看完整答案和评分细则。",
        markSchemeSummary: `${markScheme.fileName} 已和 ${questionPaper.fileName} 配对。`,
        questionPdf: {
          label: externalQuestionPaper.label,
          url: externalQuestionPaper.url,
        },
        markSchemePdf: {
          label: externalMarkScheme.label,
          url: externalMarkScheme.url,
        },
        tags: [
          "question paper",
          "mark scheme",
          "paper database",
          "local paper index",
          paper.componentCode,
          paper.paperLabel,
          paper.seriesName,
          paper.sessionLabel,
          String(paper.year),
          compactSeries,
          `9709/${paper.componentCode}/${slashSeries}/${shortYear}`,
          questionPaper.fileName,
          markScheme.fileName,
        ],
      } satisfies CieMathQuestion;
    });

  return [...detailedSeedQuestions, ...paperLevelEntries];
}

function withExternalSeedLinks(question: CieMathQuestion): CieMathQuestion {
  const yearShort = String(question.year).slice(-2);
  const seriesCode = question.series === "February/March" ? "m" : question.series === "October/November" ? "w" : "s";
  const baseFileName = `${question.syllabusCode}_${seriesCode}${yearShort}`;
  const questionPaper = toExternalPaperLink({
    label: question.questionPdf.label,
    url: question.questionPdf.url,
    fileName: `${baseFileName}_qp_${question.componentCode}.pdf`,
  });
  const markScheme = toExternalPaperLink({
    label: question.markSchemePdf.label,
    url: question.markSchemePdf.url,
    fileName: `${baseFileName}_ms_${question.componentCode}.pdf`,
  });

  return {
    ...question,
    questionPdf: {
      label: questionPaper.label,
      url: questionPaper.url,
    },
    markSchemePdf: {
      label: markScheme.label,
      url: markScheme.url,
    },
  };
}
