const { getDaysUntil, getToday, getWeekdayLabel } = require("../../utils/date");

Page({
  data: {
    today: "",
    weekday: "",
    profile: {},
    nextExam: null,
    todayTasks: [],
    todayClasses: [],
    subjects: [],
    hasTodayTasks: false,
    hasTodayClasses: false,
  },

  onShow() {
    this.refreshPage();
  },

  refreshPage() {
    const appData = getApp().getAppData();
    const today = getToday();
    const weekday = getWeekdayLabel(today);
    const subjectsWithExamDays = appData.subjects.map((subject) => ({
      ...subject,
      examDaysLeft: getDaysUntil(subject.examDate),
    }));
    const nextExam = subjectsWithExamDays
      .filter((subject) => subject.examDaysLeft >= 0)
      .sort((left, right) => left.examDaysLeft - right.examDaysLeft)[0];
    const todayTasks = appData.tasks
      .filter((task) => task.date === today)
      .map((task) => ({
        ...task,
        completedClass: task.completed ? "done" : "",
        completedMark: task.completed ? "✓" : "",
      }));
    const todayClasses = appData.timetable.filter((item) => item.day === weekday);

    this.setData({
      today,
      weekday,
      profile: appData.profile,
      nextExam: nextExam || { examTitle: "暂无考试", examDaysLeft: 0 },
      subjects: subjectsWithExamDays,
      todayTasks,
      todayClasses,
      hasTodayTasks: todayTasks.length > 0,
      hasTodayClasses: todayClasses.length > 0,
    });
  },

  toggleTask(event) {
    const taskId = event.currentTarget.dataset.id;
    const app = getApp();
    const appData = app.getAppData();
    const nextTasks = appData.tasks.map((task) => {
      if (task.id !== taskId) return task;
      return { ...task, completed: !task.completed };
    });

    app.saveAppData({ ...appData, tasks: nextTasks });
    this.refreshPage();
  },
});
