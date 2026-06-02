import { eachDayOfInterval, format, parseISO } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type RecurrenceRuleRow = Database["public"]["Tables"]["recurrence_rules"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

export const VIRTUAL_TASK_ID_REGEX = /^virtual-(.+)-(\d{4}-\d{2}-\d{2})$/;

export function parseVirtualTaskId(id: string) {
  const match = id.match(VIRTUAL_TASK_ID_REGEX);
  if (!match) return null;

  return {
    recurrenceId: match[1],
    dueDate: match[2],
  };
}

type BuildVirtualTasksParams = {
  rules: RecurrenceRuleRow[];
  templates: TaskRow[];
  materializedSet: Set<string>;
  startDate: string;
  endDate: string;
  today?: Date;
};

export function buildVirtualTasks({
  rules,
  templates,
  materializedSet,
  startDate,
  endDate,
  today = new Date(),
}: BuildVirtualTasksParams): TaskRow[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const todayStr = format(today, "yyyy-MM-dd");
  const virtualTasks: TaskRow[] = [];

  eachDayOfInterval({ start, end }).forEach((day) => {
    const dateStr = format(day, "yyyy-MM-dd");

    if (dateStr < todayStr) return;

    rules.forEach((rule) => {
      const startAnchor = parseISO(rule.start_date);
      const template = templates.find((task) => task.recurrence_id === rule.id);
      if (!template || day < startAnchor) return;

      const diffDays = Math.floor((day.getTime() - startAnchor.getTime()) / (1000 * 60 * 60 * 24));
      let shouldShow = false;

      if (rule.frequency === "daily") {
        shouldShow = diffDays % (rule.interval || 1) === 0;
      } else if (rule.frequency === "weekly") {
        const dayOfWeek = day.getDay();
        const daysConfig = rule.days_of_week || [];
        const isCorrectDay =
          daysConfig.length > 0 ? daysConfig.includes(dayOfWeek) : dayOfWeek === startAnchor.getDay();

        if (isCorrectDay) {
          const weekDiff = Math.floor(diffDays / 7);
          shouldShow = weekDiff % (rule.interval || 1) === 0;
        }
      } else if (rule.frequency === "monthly") {
        const isCorrectDay = day.getDate() === (rule.day_of_month || startAnchor.getDate());
        if (isCorrectDay) {
          const monthDiff =
            (day.getFullYear() - startAnchor.getFullYear()) * 12 + (day.getMonth() - startAnchor.getMonth());
          shouldShow = monthDiff % (rule.interval || 1) === 0;
        }
      }

      if (!shouldShow) return;

      const materializedKey = `${rule.id}__${dateStr}`;
      if (materializedSet.has(materializedKey)) return;

      virtualTasks.push({
        ...template,
        id: `virtual-${rule.id}-${dateStr}`,
        due_date: dateStr,
        status: "pending",
      });
    });
  });

  return virtualTasks;
}
