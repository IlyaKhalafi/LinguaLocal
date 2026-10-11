"use client";
import { Plus, Trash2 } from "lucide-react";
import { levels, type Lesson } from "@/lib/schema";
import { Badge } from "./ui";
import { SelectField, TextField } from "./studio-fields";

export function LessonEditor({
  lesson,
  onChange,
  onSave,
  onCancel,
}: {
  lesson: Lesson;
  onChange: (lesson: Lesson) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="panel studio-form">
      <h2>A lesson worth sharing</h2>
      <TextField
        label="Lesson title"
        value={lesson.title}
        onChange={(title) => onChange({ ...lesson, title })}
      />
      <TextField
        label="Lesson description"
        value={lesson.description}
        onChange={(description) => onChange({ ...lesson, description })}
        multiline
      />
      <div className="studio-form-row">
        <SelectField
          label="Lesson level"
          value={lesson.level}
          onChange={(level) =>
            onChange({ ...lesson, level: level as Lesson["level"] })
          }
        >
          {levels.map((level) => (
            <option key={level}>{level}</option>
          ))}
        </SelectField>
        <SelectField
          label="Lesson category"
          value={lesson.category}
          onChange={(category) =>
            onChange({ ...lesson, category: category as Lesson["category"] })
          }
        >
          {["Grammar", "Vocabulary", "Reading", "Speaking"].map((category) => (
            <option key={category}>{category}</option>
          ))}
        </SelectField>
      </div>
      <TextField
        label="Reading time in minutes"
        value={String(lesson.minutes)}
        onChange={(value) => onChange({ ...lesson, minutes: Number(value) })}
      />
      <div className="section-heading">
        <h3>Lesson sections</h3>
        <button
          className="button secondary"
          onClick={() =>
            onChange({
              ...lesson,
              sections: [...lesson.sections, { title: "", body: "" }],
            })
          }
          disabled={lesson.sections.length >= 30}
        >
          <Plus size={13} />
          Add section
        </button>
      </div>
      {lesson.sections.map((section, index) => (
        <div className="studio-resource" key={index}>
          <div className="section-heading">
            <Badge>Section {index + 1}</Badge>
            <button
              className="icon-button"
              disabled={lesson.sections.length === 1}
              aria-label={`Remove section ${index + 1}`}
              onClick={() =>
                onChange({
                  ...lesson,
                  sections: lesson.sections.filter((_, i) => i !== index),
                })
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
          <TextField
            label={`Section ${index + 1} title`}
            value={section.title}
            onChange={(title) =>
              onChange({
                ...lesson,
                sections: lesson.sections.map((s, i) =>
                  i === index ? { ...s, title } : s,
                ),
              })
            }
          />
          <TextField
            label={`Section ${index + 1} text`}
            value={section.body}
            multiline
            onChange={(body) =>
              onChange({
                ...lesson,
                sections: lesson.sections.map((s, i) =>
                  i === index ? { ...s, body } : s,
                ),
              })
            }
          />
        </div>
      ))}
      <h3 style={{ margin: "25px 0 15px" }}>A little practice question</h3>
      <TextField
        label="Practice question"
        value={lesson.question}
        onChange={(question) => onChange({ ...lesson, question })}
      />
      {lesson.options.map((option, index) => (
        <TextField
          key={index}
          label={`Answer option ${index + 1}`}
          value={option}
          onChange={(value) =>
            onChange({
              ...lesson,
              options: lesson.options.map((o, i) => (i === index ? value : o)),
            })
          }
        />
      ))}
      <SelectField
        label="Correct answer"
        value={String(lesson.answer)}
        onChange={(value) => onChange({ ...lesson, answer: Number(value) })}
      >
        {lesson.options.map((_, index) => (
          <option value={index} key={index}>
            Option {index + 1}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Answer explanation"
        value={lesson.explanation}
        multiline
        onChange={(explanation) => onChange({ ...lesson, explanation })}
      />
      <div className="button-row">
        <button className="button primary" onClick={onSave}>
          Keep lesson in draft
        </button>
        <button className="button secondary" onClick={onCancel}>
          Cancel edit
        </button>
      </div>
    </section>
  );
}
