"use client";

import { Column, PredictionResult, Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  DropAnimation,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { MoreHorizontal, MoveLeft } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { saveResults } from "@/lib/saveResults";
import Image from "next/image";

// --- Types ---

// --- Mock Data ---

const initialColumns: Column[] = [
  { id: "street", title: "Street" },
  { id: "buildings", title: "Buildings" },
  { id: "sea", title: "Sea" },
  { id: "forest", title: "Forest" },
  { id: "glacier", title: "Glacier" },
  { id: "mountain", title: "Mountain" },
];

// --- Components ---

interface KanbanBoardProps {
  initialPredictions: PredictionResult[];
}

export function KanbanBoard({
  initialPredictions,
  setMode,
}: KanbanBoardProps & { setMode?: (mode: "upload" | "review") => void }) {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery] = useState("");

  useEffect(() => {
    const mappedTasks: Task[] = initialPredictions.map((p) => {
      // Find the prediction with the highest certainty
      const highestPrediction =
        p.prediction && p.prediction.length > 0
          ? p.prediction.reduce((prev, current) =>
              prev.certainty > current.certainty ? prev : current,
            )
          : null;

      return {
        ...p,
        id: p.fileName,
        columnId: (highestPrediction?.type || "street").toLowerCase(),
      };
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasks(mappedTasks);
  }, [initialPredictions]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // 3px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery) return tasks;
    return tasks.filter((task) =>
      task.fileName.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [tasks, searchQuery]);

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Column") {
      setActiveColumn(event.active.data.current.column);
      return;
    }

    if (event.active.data.current?.type === "Task") {
      setActiveTask(event.active.data.current.task);
      return;
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";

    if (!isActiveTask) return;

    // Im dropping a Task over another Task
    if (isActiveTask && isOverTask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);

        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          const newColumnId = tasks[overIndex].columnId;
          tasks[activeIndex].columnId = newColumnId;
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    const isOverColumn = over.data.current?.type === "Column";

    // Im dropping a Task over a column
    if (isActiveTask && isOverColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const newColumnId = overId;

        tasks[activeIndex].columnId = newColumnId;

        console.log("DROPPING TASK OVER COLUMN", { activeIndex });
        return arrayMove(tasks, activeIndex, activeIndex);
      });
    }
  }

  //print changes to items
  useEffect(() => {
    console.log("Tasks updated:", tasks);
  }, [tasks]);

  function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveColumn = active.data.current?.type === "Column";
    if (isActiveColumn) {
      setColumns((columns) => {
        const activeIndex = columns.findIndex((col) => col.id === activeId);
        const overIndex = columns.findIndex((col) => col.id === overId);
        return arrayMove(columns, activeIndex, overIndex);
      });
    }
  }

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.5",
        },
      },
    }),
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col gap-6 overflow-hidden bg-background p-6">
      <Button
        variant="secondary"
        className="mr-auto"
        onClick={() => {
          if (setMode) setMode("upload");
        }}
      >
        <MoveLeft />
        Back
      </Button>
      {/* Glassmorphism background blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute left-1/2 top-0 h-130 w-130 -translate-x-1/2 rounded-full bg-foreground/[0.035] blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-90 w-90 rounded-full bg-foreground/2.5 blur-[120px]" />
        <div className="absolute top-1/2 left-1/4 h-100 w-100 rounded-full bg-primary/2 blur-[150px]" />
      </div>
      {/* Header */}
      <div className="relative flex flex-col gap-4 rounded-2xl border border-border/40 bg-background/60 p-6 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        {/* Gradient overlay */}

        <div className="relative z-10">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Review images
          </h1>
          <p className="text-foreground/60">
            Manage tasks, track progress, and collaborate with your team.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            onClick={async () => {
              console.log("Saving results...", tasks);
              await saveResults(tasks);
              // navigate to /
              window.location.href = "/";
            }}
          >
            Save images
          </Button>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full gap-6 overflow-x-auto pb-4">
          <SortableContext
            items={columnsId}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((col) => (
              <BoardColumn
                key={col.id}
                column={col}
                tasks={filteredTasks.filter((task) => task.columnId === col.id)}
              />
            ))}
          </SortableContext>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={dropAnimation}>
          {activeColumn && (
            <BoardColumn
              column={activeColumn}
              tasks={tasks.filter((task) => task.columnId === activeColumn.id)}
              isOverlay
            />
          )}
          {activeTask && <TaskCard task={activeTask} isOverlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface BoardColumnProps {
  column: Column;
  tasks: Task[];
  isOverlay?: boolean;
}

function BoardColumn({ column, tasks, isOverlay }: BoardColumnProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "Column", column },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const tasksIds = useMemo(() => tasks.map((task) => task.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/column relative flex h-full w-87.5 min-w-87.5 flex-col overflow-hidden rounded-2xl border border-border/40 bg-background/50 backdrop-blur-xl shadow-lg",
        isDragging && "opacity-50",
        isOverlay &&
          "rotate-2 scale-105 shadow-2xl cursor-grabbing bg-background/70",
      )}
    >
      {/* Gradient overlay for column */}
      <div className="absolute inset-0 bg-linear-to-br from-foreground/3 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/column:opacity-100" />

      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className="relative z-10 flex items-center justify-between border-b border-border/30 bg-background/30 p-4 backdrop-blur-sm cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary shadow-sm shadow-primary/20 backdrop-blur-sm">
            {tasks.length}
          </div>
          <h3 className="font-semibold text-foreground">{column.title}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-foreground/40 hover:text-foreground hover:bg-background/50"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Column Content */}
      <div className="relative z-10 flex flex-1 flex-col gap-3 p-3">
        <SortableContext
          items={tasksIds}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
}

function TaskCard({ task, isOverlay }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative flex cursor-grab flex-col gap-3 overflow-hidden rounded-xl border border-border/40 bg-background/70 p-4 shadow-lg backdrop-blur-xl transition-all hover:border-border/60 hover:shadow-xl hover:-translate-y-1 active:cursor-grabbing",
        isDragging && "opacity-30",
        isOverlay &&
          "rotate-2 scale-105 shadow-2xl cursor-grabbing opacity-100 bg-background/90 backdrop-blur-xl z-50",
      )}
    >
      {/* Gradient overlay for card */}
      <div className="absolute inset-0 bg-linear-to-br from-foreground/2 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
        <Image
          src={task.imageUrl}
          alt={task.fileName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          width={150}
          height={150}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span
          className="text-sm font-medium text-foreground truncate"
          title={task.fileName}
        >
          {task.fileName}
        </span>
        {task.prediction && task.prediction.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{task.prediction[0].type}</span>
            <span>{(task.prediction[0].certainty * 100).toFixed(1)}%</span>
          </div>
        )}
        {task.columnId && (
          <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
            Manual: {task.columnId}
          </Badge>
        )}
      </div>
    </div>
  );
}
