function studySteps(completedCount) {
  return ["看完课本内容", "整理笔记", "完成练习", "复盘错题", "限时小测"].map((title, index) => ({
    id: `step-${index + 1}`,
    title,
    completed: index < completedCount,
  }));
}

function createInitialAppData() {
  const subjects = [
    {
      id: "math",
      name: "数学",
      board: "CAIE",
      code: "9709",
      examTitle: "CAIE 数学 P2",
      examDate: "2026-06-12",
      progress: 48,
      color: "#BDE7F8",
      accent: "#4CAFD6",
      wrongQuestions: 13,
      units: [
        createUnit("math-u1", "math", "Pure 1 Functions", 68, "复习中", 4),
        createUnit("math-u2", "math", "Integration", 48, "练习中", 3),
        createUnit("math-u3", "math", "Statistics Probability", 42, "需要补", 2),
      ],
    },
    {
      id: "econ",
      name: "经济",
      board: "CAIE",
      code: "9708",
      examTitle: "CAIE 经济 Paper 1",
      examDate: "2026-06-15",
      progress: 62,
      color: "#FFE8A3",
      accent: "#E9A83A",
      wrongQuestions: 23,
      units: [
        createUnit("econ-u1", "econ", "基础经济学概念", 80, "复习中", 5),
        createUnit("econ-u2", "econ", "价格体系", 65, "练习中", 4),
        createUnit("econ-u3", "econ", "市场失灵", 55, "复习中", 3),
      ],
    },
    {
      id: "cs",
      name: "计算机",
      board: "CAIE",
      code: "9618",
      examTitle: "CAIE 计算机 Paper 1",
      examDate: "2026-06-22",
      progress: 58,
      color: "#BFE8D4",
      accent: "#4EAD77",
      wrongQuestions: 16,
      units: [
        createUnit("cs-u1", "cs", "Data Representation", 62, "复习中", 4),
        createUnit("cs-u2", "cs", "Algorithms", 58, "练习中", 4),
        createUnit("cs-u3", "cs", "Databases", 50, "需要补", 2),
      ],
    },
    {
      id: "phy",
      name: "物理",
      board: "CAIE",
      code: "9702",
      examTitle: "CAIE 物理 Paper 2",
      examDate: "2026-06-19",
      progress: 45,
      color: "#D8C7FF",
      accent: "#7D6FD1",
      wrongQuestions: 11,
      units: [
        createUnit("phy-u1", "phy", "Mechanics", 45, "需要补", 2),
        createUnit("phy-u2", "phy", "Electricity", 52, "练习中", 3),
      ],
    },
  ];

  return {
    profile: {
      name: "Mark",
      grade: "G12 / A2",
      system: "A-Level",
      board: "CAIE",
    },
    subjects,
    tasks: [
      createTask("task-1", "数学 P2 真题限时训练", "math", "2026-06-04", "09:30", "10:30", "高", false),
      createTask("task-2", "经济 essay plan", "econ", "2026-06-04", "14:00", "15:00", "中", false),
      createTask("task-3", "计算机算法复盘", "cs", "2026-06-05", "19:00", "19:45", "中", false),
      createTask("task-4", "物理 mechanics 错题", "phy", "2026-06-06", "16:00", "17:00", "高", false),
    ],
    timetable: [
      createClass("class-1", "数学", "math", "周一", "09:00", "10:20", "A203", "#BDE7F8"),
      createClass("class-2", "经济", "econ", "周二", "10:30", "11:50", "B110", "#FFE8A3"),
      createClass("class-3", "计算机", "cs", "周三", "13:30", "14:50", "Lab 2", "#BFE8D4"),
      createClass("class-4", "物理", "phy", "周四", "09:00", "10:20", "C301", "#D8C7FF"),
      createClass("class-5", "数学", "math", "周四", "13:30", "14:50", "A203", "#BDE7F8"),
      createClass("class-6", "经济", "econ", "周五", "11:00", "12:20", "B110", "#FFE8A3"),
    ],
    mistakes: [
      { id: "mistake-1", subjectId: "math", title: "Integration substitution", reason: "换元后上下限忘记同步", status: "需要复习" },
      { id: "mistake-2", subjectId: "econ", title: "Market failure essay", reason: "评价段落太短", status: "已复习一次" },
      { id: "mistake-3", subjectId: "phy", title: "Force components", reason: "方向分量符号写反", status: "需要复习" },
    ],
  };
}

function createUnit(id, subjectId, title, progress, status, completedCount) {
  return {
    id,
    subjectId,
    title,
    progress,
    learningProgress: progress,
    practiceProgress: progress,
    status,
    checklist: studySteps(completedCount),
  };
}

function createTask(id, title, subjectId, date, startTime, endTime, priority, completed) {
  return {
    id,
    title,
    subjectId,
    date,
    startTime,
    endTime,
    priority,
    completed,
  };
}

function createClass(id, title, subjectId, day, startTime, endTime, room, color) {
  return {
    id,
    title,
    subjectId,
    day,
    startTime,
    endTime,
    room,
    color,
  };
}

module.exports = {
  createInitialAppData,
};
