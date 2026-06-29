const { getDaysUntil } = require("../../utils/date");

Page({
  data: {
    subject: null,
    mistakes: [],
    showMistakeEmpty: false,
  },

  onLoad(options) {
    this.subjectId = options.id;
  },

  onShow() {
    const appData = getApp().getAppData();
    const subject = appData.subjects.find((item) => item.id === this.subjectId);
    if (!subject) return;

    this.setData({
      subject: {
        ...subject,
        examDaysLeft: getDaysUntil(subject.examDate),
      },
      mistakes: appData.mistakes.filter((mistake) => mistake.subjectId === subject.id),
      showMistakeEmpty: appData.mistakes.filter((mistake) => mistake.subjectId === subject.id).length === 0,
    });
  },
});
