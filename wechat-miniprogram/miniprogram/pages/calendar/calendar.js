const { formatMonthTitle, getToday } = require("../../utils/date");

Page({
  data: {
    today: "",
    monthTitle: "",
    events: [],
  },

  onShow() {
    const appData = getApp().getAppData();
    const today = getToday();
    const taskEvents = appData.tasks.map((task) => ({
      id: task.id,
      date: task.date,
      dateLabel: task.date.slice(5),
      time: task.startTime || "",
      timeLabel: task.startTime || "全天",
      title: task.title,
      type: "任务",
      subjectId: task.subjectId,
      completed: task.completed,
      statusLabel: task.completed ? "已完成" : "待完成",
    }));
    const examEvents = appData.subjects.map((subject) => ({
      id: `exam-${subject.id}`,
      date: subject.examDate,
      dateLabel: subject.examDate.slice(5),
      time: "",
      timeLabel: "全天",
      title: subject.examTitle,
      type: "考试",
      subjectId: subject.id,
      completed: false,
      statusLabel: "待完成",
    }));

    this.setData({
      today,
      monthTitle: formatMonthTitle(today),
      events: [...taskEvents, ...examEvents].sort((left, right) => left.date.localeCompare(right.date)),
    });
  },
});
