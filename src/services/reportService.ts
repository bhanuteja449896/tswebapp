import Project from '../models/Project';
import Task from '../models/Task';
import { analyticsService } from './analyticsService';
import { format } from 'date-fns';

export class ReportService {
  /* =========================
     PROJECT REPORTS
  ========================= */

  async generateProjectSummaryReport(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const project = await Project.findById(projectId).populate('owner members');
    if (!project) throw new Error('Project not found');

    const analytics = await analyticsService.getProjectAnalytics(
      projectId,
      startDate,
      endDate
    );
    const healthScore = await analyticsService.getProjectHealthScore(projectId);

    return JSON.stringify(
      {
        project: {
          name: project.name,
          description: project.description,
          status: project.status,
          owner: project.owner,
          members: project.members,
          startDate: project.startDate,
          endDate: project.endDate,
        },
        analytics,
        healthScore,
        reportPeriod: { start: startDate, end: endDate },
        generatedAt: new Date(),
      },
      null,
      2
    );
  }

  async generateTeamPerformanceReport(
    projectId: string,
    startDate: Date,
    endDate: Date
  ) {
    const metrics = await analyticsService.getTeamPerformanceMetrics(
      projectId,
      startDate,
      endDate
    );

    return {
      title: 'Team Performance Report',
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      },
      summary: {
        totalMembers: metrics.totalMembers,
        totalTasks: metrics.totalTasks,
        completedTasks: metrics.completedTasks,
        overallCompletionRate:
          (metrics.completedTasks / metrics.totalTasks) * 100 || 0,
      },
      topPerformers: metrics.memberMetrics.slice(0, 5),
      needsAttention: metrics.memberMetrics
        .filter((m) => m.completionRate < 50)
        .slice(0, 5),
      recommendations: this.generateTeamRecommendations(metrics),
      generatedAt: new Date(),
    };
  }

  async generateTaskCompletionReport(
    projectId: string,
    month: number,
    year: number
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const tasks = await Task.find({
      project: projectId,
      status: 'done',
      completedAt: { $gte: startDate, $lte: endDate },
    }).populate('assignedTo createdBy');

    return {
      title: 'Task Completion Report',
      period: format(startDate, 'MMMM yyyy'),
      totalCompleted: tasks.length,
      completedByUser: this.groupTasksByUser(tasks),
      completedByPriority: this.groupTasksByPriority(tasks),
      avgCompletionTime: await this.calculateAvgCompletionTime(tasks),
      onTimeDelivery: this.calculateOnTimeDelivery(tasks),
      tasks: tasks.map((t) => ({
        id: t._id,
        title: t.title,
        priority: t.priority,
        assignedTo: t.assignedTo,
        completedAt: t.completedAt,
        dueDate: t.dueDate,
      })),
      generatedAt: new Date(),
    };
  }

  async generateWeeklyStatusReport(projectId: string, weekStart: Date) {
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
    const project = await Project.findById(projectId);
    if (!project) throw new Error('Project not found');

    const tasks = await Task.find({
      project: projectId,
      $or: [
        { createdAt: { $gte: weekStart, $lte: weekEnd } },
        { completedAt: { $gte: weekStart, $lte: weekEnd } },
        { updatedAt: { $gte: weekStart, $lte: weekEnd } },
      ],
    });

    return {
      title: 'Weekly Status Report',
      project: project.name,
      week: {
        start: format(weekStart, 'yyyy-MM-dd'),
        end: format(weekEnd, 'yyyy-MM-dd'),
      },
      summary: {
        tasksCreated: tasks.filter((t) => t.createdAt >= weekStart).length,
        tasksCompleted: tasks.filter(
          (t) => t.completedAt && t.completedAt >= weekStart
        ).length,
        tasksInProgress: tasks.filter((t) => t.status === 'in_progress').length,
        overdueTasks: tasks.filter(
          (t) => t.dueDate && t.dueDate < new Date() && t.status !== 'done'
        ).length,
      },
      highlights: await this.generateWeeklyHighlights(
        projectId,
        weekStart,
        weekEnd
      ),
      concerns: await this.generateWeeklyConcerns(
        projectId,
        weekStart,
        weekEnd
      ),
      upcomingDeadlines: await this.getUpcomingDeadlines(projectId, weekEnd),
      generatedAt: new Date(),
    };
  }

  /* =========================
     HELPERS (unchanged logic)
  ========================= */

  private groupTasksByUser(tasks: any[]) {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      if (t.assignedTo) {
        const id = t.assignedTo._id.toString();
        map.set(id, (map.get(id) || 0) + 1);
      }
    });
    return Array.from(map, ([userId, count]) => ({ userId, count }));
  }

  private groupTasksByPriority(tasks: any[]) {
    return {
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };
  }

  private async calculateAvgCompletionTime(tasks: any[]) {
    const completed = tasks.filter((t) => t.completedAt && t.createdAt);
    if (!completed.length) return 0;

    const total = completed.reduce(
      (a, t) => a + (t.completedAt.getTime() - t.createdAt.getTime()),
      0
    );

    return total / completed.length / 86400000;
  }

  private calculateOnTimeDelivery(tasks: any[]) {
    const withDueDate = tasks.filter((t) => t.dueDate);
    if (!withDueDate.length) return 100;

    const onTime = withDueDate.filter(
      (t) => t.completedAt && t.completedAt <= t.dueDate
    );
    return (onTime.length / withDueDate.length) * 100;
  }

  private generateTeamRecommendations(metrics: any): string[] {
    const recs: string[] = [];

    const low = metrics.memberMetrics.filter(
      (m: any) => m.completionRate < 50
    );
    if (low.length)
      recs.push(
        `${low.length} member(s) have completion below 50%. Consider follow-ups.`
      );

    const avg =
      metrics.memberMetrics.reduce(
        (a: number, m: any) => a + m.completionRate,
        0
      ) / metrics.memberMetrics.length;

    if (avg < 70)
      recs.push(
        'Overall completion rate below 70%. Review scope and deadlines.'
      );

    return recs;
  }

  private async generateWeeklyHighlights(
    projectId: string,
    start: Date,
    end: Date
  ) {
    const count = await Task.countDocuments({
      project: projectId,
      status: 'done',
      completedAt: { $gte: start, $lte: end },
    });

    return count ? [`Completed ${count} tasks this week`] : [];
  }

  private async generateWeeklyConcerns(
    projectId: string,
    _start: Date,
    _end: Date
  ) {
    const overdue = await Task.countDocuments({
      project: projectId,
      dueDate: { $lt: new Date() },
      status: { $ne: 'done' },
    });

    return overdue ? [`${overdue} overdue tasks need attention`] : [];
  }

  private async getUpcomingDeadlines(projectId: string, from: Date) {
    const to = new Date(from.getTime() + 7 * 86400000);

    const tasks = await Task.find({
      project: projectId,
      dueDate: { $gte: from, $lte: to },
      status: { $ne: 'done' },
    })
      .sort({ dueDate: 1 })
      .limit(10);

    return tasks.map((t) => ({
      id: t._id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      assignedTo: t.assignedTo,
    }));
  }
}

export const reportService = new ReportService();
