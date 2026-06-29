const {
  buildQuestionSearchSignal,
  getCieMathDatabaseStats,
  searchCieMathQuestions,
} = require("../../features/question-search/question-search-engine");

const componentFilters = [
  { id: "all", label: "全部" },
  { id: "pure", label: "Pure" },
  { id: "mechanics", label: "Mechanics" },
  { id: "statistics", label: "Statistics" },
];

Page({
  data: {
    query: "",
    componentGroup: "all",
    componentFilters: [],
    uploadedImagePath: "",
    fileName: "",
    signalSummary: "等待图片或关键词",
    paperSummary: "未识别到 Paper / 题号",
    databaseStats: {},
    results: [],
    showEmpty: false,
  },

  onLoad() {
    this.setData({ databaseStats: getCieMathDatabaseStats() });
    this.refreshResults();
  },

  onInputQuery(event) {
    this.setData({ query: event.detail.value }, () => this.refreshResults());
  },

  selectComponent(event) {
    this.setData({ componentGroup: event.currentTarget.dataset.id }, () => this.refreshResults());
  },

  chooseQuestionImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (result) => {
        const imagePath = result.tempFilePaths[0];
        const fileName = getFileName(imagePath);
        this.setData(
          {
            uploadedImagePath: imagePath,
            fileName,
            query: this.data.query || cleanFileName(fileName),
          },
          () => this.refreshResults(),
        );
      },
    });
  },

  clearImage() {
    this.setData({ uploadedImagePath: "", fileName: "" }, () => this.refreshResults());
  },

  copyLink(event) {
    const url = event.currentTarget.dataset.url;
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: "链接已复制", icon: "success" });
      },
    });
  },

  refreshResults() {
    const request = {
      query: this.data.query,
      fileName: this.data.fileName,
      componentGroup: this.data.componentGroup,
    };
    const signal = buildQuestionSearchSignal(request);
    const results = searchCieMathQuestions(request).map(decorateResult);

    this.setData({
      signalSummary: signal.keyword || signal.fileName || "等待图片或关键词",
      paperSummary: signal.paperRefs.length > 0 ? signal.paperRefs.map(formatPaperRef).join(" · ") : "未识别到 Paper / 题号",
      componentFilters: componentFilters.map((filter) => ({
        ...filter,
        activeClass: filter.id === this.data.componentGroup ? "active" : "",
      })),
      results,
      showEmpty: results.length === 0,
    });
  },
});

function decorateResult(result) {
  const question = result.question;
  return {
    id: question.id,
    score: result.score,
    ref: `${question.syllabusCode}/${question.componentCode} Q${question.questionNumber}`,
    paper: `${question.series} ${question.year} · ${question.paperLabel}`,
    title: question.title,
    topic: question.topic,
    questionSummary: question.questionSummary,
    markSchemeSummary: question.markSchemeSummary,
    questionPdf: question.questionPdf,
    markSchemePdf: question.markSchemePdf,
    reasonText: result.matchReasons.join(" · ") || "题库推荐",
  };
}

function formatPaperRef(reference) {
  return [
    reference.syllabusCode,
    reference.componentCode ? `Paper ${reference.componentCode}` : "",
    reference.series,
    reference.year,
    reference.questionNumber ? `Q${reference.questionNumber}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getFileName(filePath) {
  const parts = String(filePath || "").split("/");
  return parts[parts.length - 1] || "question-image";
}

function cleanFileName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
}
