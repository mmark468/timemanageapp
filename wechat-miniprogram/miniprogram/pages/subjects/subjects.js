const { getDaysUntil } = require("../../utils/date");

Page({
  data: {
    subjects: [],
    mistakeCount: 0,
  },

  onShow() {
    const appData = getApp().getAppData();
    this.setData({
      subjects: appData.subjects.map((subject) => ({
        ...subject,
        examDaysLeft: getDaysUntil(subject.examDate),
      })),
      mistakeCount: appData.mistakes.filter((mistake) => mistake.status !== "已掌握").length,
    });
  },

  openSubject(event) {
    wx.navigateTo({
      url: `/pages/subject-detail/subject-detail?id=${event.currentTarget.dataset.id}`,
    });
  },
});
