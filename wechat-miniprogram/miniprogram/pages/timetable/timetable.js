const dayLabels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

Page({
  data: {
    dayTabs: [],
    selectedDay: "周一",
    classes: [],
    showEmpty: false,
  },

  onShow() {
    this.refreshPage();
  },

  selectDay(event) {
    this.setData({ selectedDay: event.currentTarget.dataset.day }, () => this.refreshPage());
  },

  refreshPage() {
    const appData = getApp().getAppData();
    const classes = appData.timetable
      .filter((item) => item.day === this.data.selectedDay)
      .sort((left, right) => left.startTime.localeCompare(right.startTime));

    this.setData({
      dayTabs: dayLabels.map((label) => ({
        label,
        activeClass: label === this.data.selectedDay ? "active" : "",
      })),
      classes,
      showEmpty: classes.length === 0,
    });
  },
});
