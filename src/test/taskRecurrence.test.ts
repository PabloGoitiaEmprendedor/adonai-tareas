import { describe, expect, it } from "vitest";
import { buildVirtualTasks, parseVirtualTaskId } from "@/lib/taskRecurrence";

describe("taskRecurrence", () => {
  it("parses virtual task ids", () => {
    expect(parseVirtualTaskId("virtual-rule-123-2026-06-01")).toEqual({
      recurrenceId: "rule-123",
      dueDate: "2026-06-01",
    });
    expect(parseVirtualTaskId("task-123")).toBeNull();
  });

  it("builds future virtual tasks and skips already materialized instances", () => {
    const rules = [
      {
        id: "rule-1",
        user_id: "user-1",
        frequency: "daily",
        interval: 1,
        start_date: "2026-06-01",
        end_date: null,
        day_of_month: null,
        days_of_week: null,
        deleted_at: null,
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
        title: null,
        description: null,
        estimated_minutes: null,
        end_time: null,
        metadata: null,
        start_time: null,
      },
    ];

    const templates = [
      {
        id: "template-1",
        user_id: "user-1",
        title: "Daily check-in",
        description: null,
        status: "pending",
        priority: null,
        urgency: null,
        importance: null,
        estimated_minutes: null,
        actual_minutes: null,
        due_date: "2026-06-01",
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
        completed_at: null,
        source_type: null,
        context_id: null,
        goal_id: null,
        folder_id: null,
        recurrence_id: "rule-1",
        parent_task_id: null,
        time_block_id: null,
        deleted_at: null,
        deleted_by: null,
        deleted_reason: null,
        link: null,
        metadata: null,
        sort_order: null,
      },
    ];

    const virtualTasks = buildVirtualTasks({
      rules,
      templates,
      materializedSet: new Set(["rule-1__2026-06-02"]),
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      today: new Date("2026-06-01T12:00:00.000Z"),
    });

    expect(virtualTasks.map((task) => task.id)).toEqual([
      "virtual-rule-1-2026-06-01",
      "virtual-rule-1-2026-06-03",
    ]);
  });
});
