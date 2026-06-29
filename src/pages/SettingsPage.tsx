import { Moon, Save, SunMedium, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Chip } from "../components/Chip";
import { PageHeader } from "../components/PageHeader";
import type { CourseSystem, ExamBoard, GradeLevel, StudentProfile, Subject, VisualStyle } from "../types";

interface SettingsPageProps {
  profile: StudentProfile | null;
  subjects: Subject[];
  visualStyle: VisualStyle;
  onVisualStyleChange: (style: VisualStyle) => void;
  onBack: () => void;
  onSave: (profile: StudentProfile) => void;
}

const grades: GradeLevel[] = ["G9", "G10 / IGCSE", "G11 / AS", "G12 / A2", "IB DP1", "IB DP2", "备考年"];
const systems: CourseSystem[] = ["A-Level", "IB", "AP", "IGCSE", "SAT", "IELTS", "TOEFL"];
const boards: ExamBoard[] = ["CAIE", "Edexcel", "AQA", "OCR", "IB", "College Board"];
const visualStyles: Array<{ id: VisualStyle; label: string; detail: string; icon: typeof SunMedium }> = [
  { id: "light", label: "浅色模式", detail: "奶油底色、赤陶橙与松绿强调", icon: SunMedium },
  { id: "dark", label: "深色模式", detail: "暖黑背景、低亮度纸感层次", icon: Moon },
];

export function SettingsPage({
  profile,
  subjects,
  visualStyle,
  onVisualStyleChange,
  onBack,
  onSave,
}: SettingsPageProps) {
  const [name, setName] = useState(profile?.name ?? "");
  const [grade, setGrade] = useState<GradeLevel>(profile?.grade ?? "G11 / AS");
  const [selectedSystems, setSelectedSystems] = useState<CourseSystem[]>(profile?.systems ?? ["A-Level"]);
  const [selectedBoards, setSelectedBoards] = useState<ExamBoard[]>(profile?.boards ?? ["CAIE"]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    profile?.subjects ?? subjects.map((subject) => subject.name),
  );

  const toggle = <T extends string>(items: T[], item: T, setItems: (next: T[]) => void) => {
    setItems(items.includes(item) ? items.filter((value) => value !== item) : [...items, item]);
  };

  const save = () => {
    onSave({
      name: name.trim() || "同学",
      grade,
      systems: selectedSystems.length ? selectedSystems : ["A-Level"],
      boards: selectedBoards.length ? selectedBoards : ["CAIE"],
      subjects: selectedSubjects,
      createdAt: profile?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <main className="settings-page px-5 pb-28 pt-7">
      <PageHeader title="设置" subtitle="个人信息和当前学习范围。" onBack={onBack} />

      <section className="rounded-[28px] bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-[20px] bg-ink text-white">
            <UserRound size={22} />
          </div>
          <div>
            <p className="text-lg font-black text-ink">个人信息</p>
            <p className="text-xs font-bold text-muted">会影响首页称呼和科目显示</p>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-black text-ink">名字</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-12 w-full rounded-[18px] bg-cream px-4 text-sm font-black outline-none focus:ring-2 focus:ring-ink/10"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-black text-ink">年级</span>
          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value as GradeLevel)}
            className="mt-2 h-12 w-full rounded-[18px] bg-cream px-4 text-sm font-black outline-none focus:ring-2 focus:ring-ink/10"
          >
            {grades.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="visual-style-panel mt-4 rounded-[26px] bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-ink">显示模式</h2>
            <p className="mt-1 text-xs font-bold text-muted">浅色与深色会立刻应用</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-cream text-ink">
            <SunMedium size={18} />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {visualStyles.map((item) => {
            const Icon = item.icon;
            const active = visualStyle === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onVisualStyleChange(item.id)}
                className={`visual-style-card rounded-[20px] p-3 text-left transition ${
                  active ? "is-active bg-ink text-white shadow-pill" : "bg-cream text-ink"
                }`}
              >
                <span className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-white text-ink">
                  <Icon size={17} />
                </span>
                <span className="block text-sm font-black">{item.label}</span>
                <span className={`mt-1 block text-[11px] font-bold leading-4 ${active ? "text-white/70" : "text-muted"}`}>
                  {item.detail}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <Section title="课程体系">
        {systems.map((item, index) => (
          <Chip
            key={item}
            selected={selectedSystems.includes(item)}
            color={index % 2 === 0 ? "blue" : "yellow"}
            onClick={() => toggle(selectedSystems, item, setSelectedSystems)}
          >
            {item}
          </Chip>
        ))}
      </Section>

      <Section title="考试局">
        {boards.map((item, index) => (
          <Chip
            key={item}
            selected={selectedBoards.includes(item)}
            color={index % 2 === 0 ? "green" : "purple"}
            onClick={() => toggle(selectedBoards, item, setSelectedBoards)}
          >
            {item}
          </Chip>
        ))}
      </Section>

      <Section title="正在学习的科目">
        {subjects.map((subject, index) => (
          <Chip
            key={subject.id}
            selected={selectedSubjects.includes(subject.name)}
            color={index % 2 === 0 ? "blue" : "yellow"}
            onClick={() => toggle(selectedSubjects, subject.name, setSelectedSubjects)}
          >
            {subject.name}
          </Chip>
        ))}
      </Section>

      <button
        type="button"
        onClick={save}
        className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-black text-white shadow-pill"
      >
        <Save size={17} />
        保存设置
      </button>
    </main>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-[26px] bg-white p-4 shadow-soft">
      <h2 className="mb-3 text-sm font-black text-ink">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}
