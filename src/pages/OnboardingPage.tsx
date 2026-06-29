import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Chip } from "../components/Chip";
import type { CourseSystem, ExamBoard, GradeLevel, StudentProfile, SubjectName } from "../types";

interface OnboardingPageProps {
  onComplete: (profile: StudentProfile) => void;
}

const systems: CourseSystem[] = ["A-Level", "IB", "AP", "IGCSE", "SAT", "IELTS", "TOEFL"];
const boards: ExamBoard[] = ["CAIE", "Edexcel", "AQA", "OCR", "IB", "College Board"];
const grades: GradeLevel[] = ["G9", "G10 / IGCSE", "G11 / AS", "G12 / A2", "IB DP1", "IB DP2", "备考年"];
const subjects: SubjectName[] = ["经济", "数学", "心理学", "计算机", "英语", "物理", "化学", "生物", "商科"];

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState<GradeLevel>("G11 / AS");
  const [selectedSystems, setSelectedSystems] = useState<CourseSystem[]>(["A-Level"]);
  const [selectedBoards, setSelectedBoards] = useState<ExamBoard[]>(["CAIE"]);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectName[]>([]);
  const canContinue = studentName.trim().length > 0 && selectedSubjects.length > 0;

  const completeProfile = () => {
    if (!canContinue) return;

    onComplete({
      name: studentName.trim(),
      grade,
      systems: selectedSystems.length > 0 ? selectedSystems : ["A-Level"],
      boards: selectedBoards.length > 0 ? selectedBoards : ["CAIE"],
      subjects: selectedSubjects,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <main className="relative min-h-screen px-5 py-7">
      <div className="mb-7 rounded-[30px] bg-white/80 p-5 shadow-soft">
        <p className="text-sm font-bold text-muted">时间规划设置</p>
        <h1 className="mt-2 text-3xl font-black leading-tight tracking-normal text-ink">
          先建立你的
          <br />
          学习档案
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">填好名字、年级和科目后，就可以进入课表设置。</p>
      </div>

      <section className="space-y-6 pb-28">
        <div className="rounded-[26px] bg-white/80 p-4 shadow-soft">
          <label className="block">
            <span className="text-sm font-black text-ink">你的名字</span>
            <input
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              placeholder="例如：Alex"
              className="mt-2 h-12 w-full rounded-[18px] border border-transparent bg-cream px-4 text-base font-black text-ink outline-none focus:border-sky"
            />
          </label>

          <div className="mt-5">
            <h2 className="mb-3 text-sm font-black text-ink">年级 / 阶段</h2>
            <div className="flex flex-wrap gap-2">
              {grades.map((item, index) => (
                <Chip
                  key={item}
                  selected={grade === item}
                  color={index % 3 === 0 ? "blue" : index % 3 === 1 ? "yellow" : "green"}
                  onClick={() => setGrade(item)}
                >
                  {item}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-black text-ink">课程体系</h2>
          <div className="flex flex-wrap gap-2">
            {systems.map((system, index) => (
              <Chip
                key={system}
                selected={selectedSystems.includes(system)}
                color={index % 2 === 0 ? "blue" : "yellow"}
                onClick={() => setSelectedSystems((current) => toggleValue(current, system))}
              >
                {system}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-black text-ink">考试局</h2>
          <div className="flex flex-wrap gap-2">
            {boards.map((board, index) => (
              <Chip
                key={board}
                selected={selectedBoards.includes(board)}
                color={index % 2 === 0 ? "green" : "purple"}
                onClick={() => setSelectedBoards((current) => toggleValue(current, board))}
              >
                {board}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-black text-ink">科目</h2>
          <div className="flex flex-wrap gap-2">
            {subjects.map((subject, index) => (
              <Chip
                key={subject}
                selected={selectedSubjects.includes(subject)}
                color={index % 3 === 0 ? "pink" : index % 3 === 1 ? "blue" : "yellow"}
                onClick={() => setSelectedSubjects((current) => toggleValue(current, subject))}
              >
                {subject}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cream via-cream to-transparent px-5 pb-7 pt-10">
        <button
          type="button"
          onClick={completeProfile}
          disabled={!canContinue}
          className={`flex h-14 w-full items-center justify-center gap-2 rounded-full text-base font-black shadow-pill transition ${
            canContinue ? "bg-ink text-white hover:-translate-y-0.5" : "bg-white/80 text-muted"
          }`}
        >
          下一步：设置课表
          <ArrowRight size={19} />
        </button>
      </div>
    </main>
  );
}
