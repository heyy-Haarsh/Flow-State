import { useCallback } from 'react';
import { useFlowStateStore } from '@/stores/flowstate-store';
import type { Task, TaskComplexity, TaskStatus } from '@/types/flowstate';

/**
 * Hook for task CRUD operations.
 */
export function useTasks() {
    const tasks = useFlowStateStore((state) => state.tasks);
    const addTask = useFlowStateStore((state) => state.addTask);
    const updateTask = useFlowStateStore((state) => state.updateTask);
    const deleteTask = useFlowStateStore((state) => state.deleteTask);
    const startTask = useFlowStateStore((state) => state.startTask);
    const completeTask = useFlowStateStore((state) => state.completeTask);

    const getTasksByStatus = useCallback(
        (status: TaskStatus) => tasks.filter((t) => t.status === status),
        [tasks]
    );

    const getTasksByComplexity = useCallback(
        (complexity: TaskComplexity) => tasks.filter((t) => t.complexity === complexity),
        [tasks]
    );

    const getActiveTask = useCallback(
        () => tasks.find((t) => t.status === 'in_progress') || null,
        [tasks]
    );

    const getSuggestedTasks = useCallback(
        (energyScore: number) => {
            const pending = tasks.filter((t) => t.status === 'pending');

            if (energyScore >= 80) {
                // Peak energy → suggest hard tasks first
                return pending.sort((a, b) => {
                    const order = { high: 0, medium: 1, low: 2 };
                    return order[a.complexity] - order[b.complexity];
                });
            } else if (energyScore >= 60) {
                // Good energy → medium first
                return pending.sort((a, b) => {
                    const order = { medium: 0, high: 1, low: 2 };
                    return order[a.complexity] - order[b.complexity];
                });
            } else {
                // Low/critical → easy tasks first
                return pending.sort((a, b) => {
                    const order = { low: 0, medium: 1, high: 2 };
                    return order[a.complexity] - order[b.complexity];
                });
            }
        },
        [tasks]
    );

    const stats = {
        total: tasks.length,
        completed: tasks.filter((t) => t.status === 'completed').length,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        pending: tasks.filter((t) => t.status === 'pending').length,
    };

    return {
        tasks,
        addTask,
        updateTask,
        deleteTask,
        startTask,
        completeTask,
        getTasksByStatus,
        getTasksByComplexity,
        getActiveTask,
        getSuggestedTasks,
        stats,
    };
}
