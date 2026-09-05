"use client";

import { cn } from "@/lib/utils";
import { Fragment } from "react";

const CHECK_PATH = "M 3.5 7.5 L 6 10 L 10.5 4.5";
const BOX_SIZE = 14;

const SUCCESS_COLOR = "#059669"; // Emerald 600
const DANGER_COLOR = "#DC2626"; // Red 600

const boxStroke = (status) => {
  if (status === "failed") return DANGER_COLOR;
  if (status === "done") return SUCCESS_COLOR;
  return "#8F8A7E";
};

const TaskBox = ({ status }) => {
  const isDone = status === "done";
  const isFailed = status === "failed";

  return (
    <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
      <svg
        aria-hidden="true"
        className="size-3.5"
        viewBox={`0 0 ${BOX_SIZE} ${BOX_SIZE}`}
      >
        <rect
          className="transition-all duration-300"
          fill={isFailed ? DANGER_COLOR : SUCCESS_COLOR}
          fillOpacity={isDone ? 0.15 : 0}
          height={12}
          rx={3.5}
          stroke={boxStroke(status)}
          strokeWidth={1.4}
          width={12}
          x={1}
          y={1}
        />
        {isDone && (
          <path
            className="ai-task-draw"
            d={CHECK_PATH}
            fill="none"
            pathLength={1}
            stroke={SUCCESS_COLOR}
            strokeDasharray="1 1"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
          />
        )}
        {isFailed && (
          <path
            className="ai-task-draw"
            d="M 5 5 L 9 9 M 9 5 L 5 9"
            fill="none"
            pathLength={1}
            stroke={DANGER_COLOR}
            strokeDasharray="1 1"
            strokeLinecap="round"
            strokeWidth={1.8}
          />
        )}
      </svg>
    </span>
  );
};

const TaskRow = ({ depth, task }) => {
  const isRunning = task.status === "running";
  const isDone = task.status === "done";

  return (
    <li
      className={cn(
        "list-none transition-all duration-300",
        isDone ? "opacity-75 translate-y-[1px]" : "opacity-100"
      )}
      style={{ paddingLeft: depth * 20 }}
    >
      <span className="relative flex items-start gap-2.5 py-1.5 overflow-hidden">
        <TaskBox status={task.status} />

        <span className={cn(
          "min-w-0 flex-1 text-xs leading-snug font-medium transition-colors",
          isDone ? "text-[#44403C]" : isRunning ? "text-[#1F2421] font-bold" : "text-[#6E736D]"
        )}>
          {task.label}
        </span>

        {task.note ? (
          <span className="shrink-0 text-[#8F8A7E] font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#DFD9CE]">
            {task.note}
          </span>
        ) : null}

        {isRunning && (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px ai-underline-travel"
            style={{
              backgroundImage:
                "linear-gradient(90deg, transparent 0%, #27272A 50%, transparent 100%)",
              backgroundSize: "50% 100%",
              opacity: 0.6,
            }}
          />
        )}
      </span>
    </li>
  );
};

const flatten = (tasks = []) =>
  tasks.flatMap((task) => [task, ...flatten(task.children ?? [])]);

/**
 * Autonomous Plan Execution Tracker with pure CSS animations
 */
const AITaskList = ({ className, label = "Autonomous Execution Sequence", tasks = [] }) => {
  const all = flatten(tasks);
  const done = all.filter((task) => task.status === "done").length;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-[#DFD9CE] bg-[#FAF8F5] p-4 shadow-2xs text-[#1F2421]",
        className
      )}
    >
      <div className="mb-2 flex items-baseline justify-between border-b border-[#DFD9CE] pb-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          <p className="font-bold text-xs uppercase tracking-wider text-[#1F2421]">{label}</p>
        </div>
        <p className="text-[#6E736D] font-mono text-xs tabular-nums font-bold">
          {done}/{all.length} completed
        </p>
      </div>

      <style>{`
        .ai-task-draw {
          stroke-dashoffset: 0;
          animation: ai-task-draw-anim 240ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }
        @keyframes ai-task-draw-anim {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        .ai-underline-travel {
          animation: ai-underline-anim 1.4s ease-in-out infinite;
        }
        @keyframes ai-underline-anim {
          0% { background-position: 0% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <ul className="list-none space-y-0.5">
        {tasks.map((task) => (
          <Fragment key={task.id}>
            <TaskRow depth={0} task={task} />
            {task.children?.map((child) => (
              <TaskRow depth={1} key={child.id} task={child} />
            ))}
          </Fragment>
        ))}
      </ul>
    </div>
  );
};

export default AITaskList;
