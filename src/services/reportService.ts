import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { join } from 'path';
import Project from '../models/Project';
import Task from '../models/Task';
import User from '../models/User';
import { analyticsService } from './analyticsService';
import { format } from 'date-fns';

export class ReportService {
  /**
   * Generate project summary report
   */
  async generateProjectSummaryReport(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const project = await Project.findById(projectId).populate('owner members');
    if (!project) {
      throw new Error('Project not found');
    }

    const analytics = await analyticsService.getProjectAnalytics(
      projectId,
      startDate,
      endDate
    );
    const healthScore = await analyticsService.getProjectHealthScore(projectId);

    const reportData = {
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
      generatedAt: new Date(),
      reportPeriod: {
        start: startDate,
        end: endDate,
      },
    };

    return JSON.stringify(reportData, null, 2);
  }

  /**
   * Generate team performance report
   */
  async generateTeamPerformanceReport(
    projectId: string,
    startDate: Date,
    endDate: Date
  ) {
    const teamMetrics = await analyticsService.getTeamPerformanceMetrics(
      projectId,
      startDate,
      endDate
    );

    const report = {
      title: 'Team Performance Report',
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      },
      summary: {
        totalMembers: teamMetrics.totalMembers,
        totalTasks: teamMetrics.totalTasks,
        completedTasks: teamMetrics.completedTasks,
        overallCompletionRate:
          (teamMetrics.completedTasks / teamMetrics.totalTasks) * 100 || 0,
      },
      topPerformers: teamMetrics.memberMetrics.slice(0, 5),
      needsAttention: teamMetrics.memberMetrics
        .filter((m) => m.completionRate < 50)
        .slice(0, 5),
      recommendations: this.generateTeamRecommendations(teamMetrics),
      generatedAt: new Date(),
    };

    return report;
  }

  /**
   * Generate task completion report
   */
  async generateTaskCompletionReport(projectId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const tasks = await Task.find({
      project: projectId,
      completedAt: { $gte: startDate, $lte: endDate },
      status: 'done',
    }).populate('assignedTo createdBy');

    const report = {
      title: 'Task Completion Report',
      period: `${format(startDate, 'MMMM yyyy')}`,
      totalCompleted: tasks.length,
      completedByUser: this.groupTasksByUser(tasks),
      completedByPriority: this.groupTasksByPriority(tasks),
      avgCompletionTime: await this.calculateAvgCompletionTime(tasks),
      onTimeDelivery: this.calculateOnTimeDelivery(tasks),
      tasks: tasks.map((task) => ({
        id: task._id,
        title: task.title,
        priority: task.priority,
        assignedTo: task.assignedTo,
        completedAt: task.completedAt,
        dueDate: task.dueDate,
        completionTime: task.completedAt && task.createdAt
          ? (task.completedAt.getTime() - task.createdAt.getTime()) /
            (1000 * 60 * 60 * 24)
          : null,
      })),
      generatedAt: new Date(),
    };

    return report;
  }

  /**
   * Generate weekly status report
   */
  async generateWeeklyStatusReport(projectId: string, weekStart: Date) {
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = await Task.find({
      project: projectId,
      $or: [
        { createdAt: { $gte: weekStart, $lte: weekEnd } },
        { completedAt: { $gte: weekStart, $lte: weekEnd } },
        { updatedAt: { $gte: weekStart, $lte: weekEnd } },
      ],
    });

    const report = {
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
        overdueT tasks: tasks.filter(
          (t) => t.dueDate && t.dueDate < new Date() && t.status !== 'done'
        ).length,
      },
      highlights: await this.generateWeeklyHighlights(projectId, weekStart, weekEnd),
      concerns: await this.generateWeeklyConcerns(projectId, weekStart, weekEnd),
      upcomingDeadlines: await this.getUpcomingDeadlines(projectId, weekEnd),
      generatedAt: new Date(),
    };

    return report;
  }

  /**
   * Generate milestone report
   */
  async generateMilestoneReport(projectId: string) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const allTasks = await Task.find({ project: projectId });
    const milestones = this.identifyMilestones(allTasks);

    const report = {
      title: 'Project Milestones Report',
      project: project.name,
      totalMilestones: milestones.length,
      completedMilestones: milestones.filter((m) => m.completed).length,
      milestones: milestones.map((milestone) => ({
        name: milestone.name,
        description: milestone.description,
        targetDate: milestone.targetDate,
        completedDate: milestone.completedDate,
        status: milestone.completed ? 'Completed' : 'Pending',
        progress: milestone.progress,
        tasks: milestone.tasks,
      })),
      overallProgress:
        (milestones.filter((m) => m.completed).length / milestones.length) *
          100 || 0,
      generatedAt: new Date(),
    };

    return report;
  }

  /**
   * Generate budget and resource report
   */
  async generateResourceReport(projectId: string, startDate: Date, endDate: Date) {
    const project = await Project.findById(projectId).populate('members');
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = await Task.find({
      project: projectId,
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate('assignedTo');

    const workloadByMember = this.calculateWorkloadByMember(tasks);
    const estimatedEffort = this.calculateEstimatedEffort(tasks);

    const report = {
      title: 'Resource Allocation Report',
      project: project.name,
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      },
      teamSize: project.members?.length || 0,
      totalTasks: tasks.length,
      workloadDistribution: workloadByMember,
      estimatedEffort,
      utilizationRate: this.calculateUtilizationRate(
        workloadByMember,
        project.members?.length || 1
      ),
      recommendations: this.generateResourceRecommendations(workloadByMember),
      generatedAt: new Date(),
    };

    return report;
  }

  /**
   * Generate risk assessment report
   */
  async generateRiskAssessmentReport(projectId: string) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = await Task.find({ project: projectId });
    const healthScore = await analyticsService.getProjectHealthScore(projectId);

    const risks = [
      ...this.identifyScheduleRisks(tasks),
      ...this.identifyResourceRisks(tasks),
      ...this.identifyQualityRisks(tasks),
      ...this.identifyDependencyRisks(tasks),
    ];

    const report = {
      title: 'Risk Assessment Report',
      project: project.name,
      overallRiskLevel: this.calculateOverallRiskLevel(risks),
      projectHealthScore: healthScore.score,
      identifiedRisks: risks.sort((a, b) => b.severity - a.severity),
      mitigationStrategies: this.generateMitigationStrategies(risks),
      actionItems: this.generateRiskActionItems(risks),
      generatedAt: new Date(),
    };

    return report;
  }

  /**
   * Generate custom report based on criteria
   */
  async generateCustomReport(
    projectId: string,
    criteria: {
      metrics: string[];
      startDate: Date;
      endDate: Date;
      groupBy?: 'day' | 'week' | 'month';
      filters?: Record<string, any>;
    }
  ) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const reportData: any = {
      title: 'Custom Project Report',
      project: project.name,
      period: {
        start: format(criteria.startDate, 'yyyy-MM-dd'),
        end: format(criteria.endDate, 'yyyy-MM-dd'),
      },
      generatedAt: new Date(),
    };

    // Add requested metrics
    for (const metric of criteria.metrics) {
      switch (metric) {
        case 'analytics':
          reportData.analytics = await analyticsService.getProjectAnalytics(
            projectId,
            criteria.startDate,
            criteria.endDate
          );
          break;
        case 'team_performance':
          reportData.teamPerformance =
            await analyticsService.getTeamPerformanceMetrics(
              projectId,
              criteria.startDate,
              criteria.endDate
            );
          break;
        case 'health_score':
          reportData.healthScore =
            await analyticsService.getProjectHealthScore(projectId);
          break;
        case 'time_analytics':
          reportData.timeAnalytics = await analyticsService.getTimeAnalytics(
            projectId,
            criteria.startDate,
            criteria.endDate,
            criteria.groupBy || 'day'
          );
          break;
        case 'priority_analytics':
          reportData.priorityAnalytics =
            await analyticsService.getPriorityAnalytics(projectId);
          break;
        case 'deadline_analytics':
          reportData.deadlineAnalytics =
            await analyticsService.getDeadlineAnalytics(projectId);
          break;
      }
    }

    return reportData;
  }

  /**
   * Helper: Group tasks by user
   */
  private groupTasksByUser(tasks: any[]) {
    const grouped = new Map<string, number>();

    tasks.forEach((task) => {
      if (task.assignedTo) {
        const userId = task.assignedTo._id.toString();
        grouped.set(userId, (grouped.get(userId) || 0) + 1);
      }
    });

    return Array.from(grouped.entries()).map(([userId, count]) => ({
      userId,
      count,
    }));
  }

  /**
   * Helper: Group tasks by priority
   */
  private groupTasksByPriority(tasks: any[]) {
    return {
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };
  }

  /**
   * Helper: Calculate average completion time
   */
  private async calculateAvgCompletionTime(tasks: any[]): Promise<number> {
    const completedTasks = tasks.filter(
      (t) => t.completedAt && t.createdAt
    );

    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((acc, task) => {
      return (
        acc + (task.completedAt.getTime() - task.createdAt.getTime())
      );
    }, 0);

    return totalTime / completedTasks.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  /**
   * Helper: Calculate on-time delivery rate
   */
  private calculateOnTimeDelivery(tasks: any[]): number {
    const tasksWithDueDate = tasks.filter((t) => t.dueDate);
    if (tasksWithDueDate.length === 0) return 100;

    const onTimeTasks = tasksWithDueDate.filter(
      (t) => t.completedAt && t.completedAt <= t.dueDate
    );

    return (onTimeTasks.length / tasksWithDueDate.length) * 100;
  }

  /**
   * Helper: Generate weekly highlights
   */
  private async generateWeeklyHighlights(
    projectId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<string[]> {
    const highlights: string[] = [];

    const completedTasks = await Task.countDocuments({
      project: projectId,
      status: 'done',
      completedAt: { $gte: weekStart, $lte: weekEnd },
    });

    if (completedTasks > 0) {
      highlights.push(`Completed ${completedTasks} tasks this week`);
    }

    const highPriorityCompleted = await Task.countDocuments({
      project: projectId,
      status: 'done',
      priority: 'high',
      completedAt: { $gte: weekStart, $lte: weekEnd },
    });

    if (highPriorityCompleted > 0) {
      highlights.push(
        `${highPriorityCompleted} high-priority tasks completed`
      );
    }

    return highlights;
  }

  /**
   * Helper: Generate weekly concerns
   */
  private async generateWeeklyConcerns(
    projectId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<string[]> {
    const concerns: string[] = [];

    const overdueTasks = await Task.countDocuments({
      project: projectId,
      dueDate: { $lt: new Date() },
      status: { $ne: 'done' },
    });

    if (overdueTasks > 0) {
      concerns.push(`${overdueTasks} overdue tasks need attention`);
    }

    const staleTasks = await Task.countDocuments({
      project: projectId,
      status: 'in_progress',
      updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    if (staleTasks > 0) {
      concerns.push(
        `${staleTasks} tasks have not been updated in over a week`
      );
    }

    return concerns;
  }

  /**
   * Helper: Get upcoming deadlines
   */
  private async getUpcomingDeadlines(projectId: string, fromDate: Date) {
    const nextWeek = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const tasks = await Task.find({
      project: projectId,
      dueDate: { $gte: fromDate, $lte: nextWeek },
      status: { $ne: 'done' },
    })
      .sort({ dueDate: 1 })
      .limit(10);

    return tasks.map((task) => ({
      id: task._id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      assignedTo: task.assignedTo,
    }));
  }

  /**
   * Helper: Identify milestones from tasks
   */
  private identifyMilestones(tasks: any[]) {
    // Group tasks by common milestones (this is simplified)
    const milestones: any[] = [];

    const highPriorityTasks = tasks.filter((t) => t.priority === 'high');
    if (highPriorityTasks.length > 0) {
      milestones.push({
        name: 'Critical Features',
        description: 'High priority tasks',
        tasks: highPriorityTasks.length,
        completed: highPriorityTasks.filter((t) => t.status === 'done').length,
        progress:
          (highPriorityTasks.filter((t) => t.status === 'done').length /
            highPriorityTasks.length) *
          100,
      });
    }

    return milestones;
  }

  /**
   * Helper: Calculate workload by member
   */
  private calculateWorkloadByMember(tasks: any[]) {
    const workload = new Map<string, any>();

    tasks.forEach((task) => {
      if (task.assignedTo) {
        const userId = task.assignedTo._id.toString();
        if (!workload.has(userId)) {
          workload.set(userId, {
            userId,
            name: `${task.assignedTo.firstName} ${task.assignedTo.lastName}`,
            tasks: 0,
            completed: 0,
            inProgress: 0,
            todo: 0,
          });
        }

        const userWorkload = workload.get(userId);
        userWorkload.tasks++;

        if (task.status === 'done') userWorkload.completed++;
        if (task.status === 'in_progress') userWorkload.inProgress++;
        if (task.status === 'todo') userWorkload.todo++;
      }
    });

    return Array.from(workload.values());
  }

  /**
   * Helper: Calculate estimated effort
   */
  private calculateEstimatedEffort(tasks: any[]) {
    const totalTasks = tasks.length;
    const avgTaskTime = 8; // hours per task (example)

    return {
      totalTasks,
      estimatedHours: totalTasks * avgTaskTime,
      estimatedDays: (totalTasks * avgTaskTime) / 8,
    };
  }

  /**
   * Helper: Calculate utilization rate
   */
  private calculateUtilizationRate(
    workload: any[],
    teamSize: number
  ): number {
    if (teamSize === 0) return 0;

    const totalTasks = workload.reduce((acc, w) => acc + w.tasks, 0);
    const avgTasksPerMember = totalTasks / teamSize;

    // Assume ideal is 10 tasks per member
    return Math.min(100, (avgTasksPerMember / 10) * 100);
  }

  /**
   * Helper: Generate team recommendations
   */
  private generateTeamRecommendations(teamMetrics: any): string[] {
    const recommendations: string[] = [];

    const lowPerformers = teamMetrics.memberMetrics.filter(
      (m: any) => m.completionRate < 50
    );

    if (lowPerformers.length > 0) {
      recommendations.push(
        `${lowPerformers.length} team member(s) have completion rates below 50%. Consider one-on-one check-ins.`
      );
    }

    const avgCompletionRate =
      teamMetrics.memberMetrics.reduce(
        (acc: number, m: any) => acc + m.completionRate,
        0
      ) / teamMetrics.memberMetrics.length;

    if (avgCompletionRate < 70) {
      recommendations.push(
        'Overall team completion rate is below 70%. Review task complexity and deadlines.'
      );
    }

    return recommendations;
  }

  /**
   * Helper: Generate resource recommendations
   */
  private generateResourceRecommendations(workload: any[]): string[] {
    const recommendations: string[] = [];

    const overloaded = workload.filter((w) => w.tasks > 15);
    const underutilized = workload.filter((w) => w.tasks < 5);

    if (overloaded.length > 0) {
      recommendations.push(
        `${overloaded.length} team member(s) are overloaded with >15 tasks. Consider redistributing work.`
      );
    }

    if (underutilized.length > 0) {
      recommendations.push(
        `${underutilized.length} team member(s) have <5 tasks. Consider assigning more work.`
      );
    }

    return recommendations;
  }

  /**
   * Helper: Identify schedule risks
   */
  private identifyScheduleRisks(tasks: any[]) {
    const risks: any[] = [];

    const overdueTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < new Date() && t.status !== 'done'
    );

    if (overdueTasks.length > 0) {
      risks.push({
        type: 'Schedule',
        severity: Math.min(10, overdueTasks.length / 2),
        description: `${overdueTasks.length} overdue tasks may impact project timeline`,
        impact: 'High',
        probability: 'High',
      });
    }

    return risks;
  }

  /**
   * Helper: Identify resource risks
   */
  private identifyResourceRisks(tasks: any[]) {
    const risks: any[] = [];

    const unassignedTasks = tasks.filter((t) => !t.assignedTo);

    if (unassignedTasks.length > 5) {
      risks.push({
        type: 'Resource',
        severity: 6,
        description: `${unassignedTasks.length} unassigned tasks may indicate resource shortage`,
        impact: 'Medium',
        probability: 'Medium',
      });
    }

    return risks;
  }

  /**
   * Helper: Identify quality risks
   */
  private identifyQualityRisks(tasks: any[]) {
    const risks: any[] = [];

    const highPriorityPending = tasks.filter(
      (t) => t.priority === 'high' && t.status !== 'done'
    );

    if (highPriorityPending.length > 10) {
      risks.push({
        type: 'Quality',
        severity: 7,
        description: `${highPriorityPending.length} high-priority tasks pending may affect quality`,
        impact: 'High',
        probability: 'Medium',
      });
    }

    return risks;
  }

  /**
   * Helper: Identify dependency risks
   */
  private identifyDependencyRisks(tasks: any[]) {
    const risks: any[] = [];

    const blockedTasks = tasks.filter(
      (t) => t.status === 'in_progress' && t.blockedBy
    );

    if (blockedTasks.length > 0) {
      risks.push({
        type: 'Dependency',
        severity: 8,
        description: `${blockedTasks.length} tasks are blocked by dependencies`,
        impact: 'High',
        probability: 'High',
      });
    }

    return risks;
  }

  /**
   * Helper: Calculate overall risk level
   */
  private calculateOverallRiskLevel(risks: any[]): string {
    if (risks.length === 0) return 'Low';

    const avgSeverity =
      risks.reduce((acc, r) => acc + r.severity, 0) / risks.length;

    if (avgSeverity >= 8) return 'Critical';
    if (avgSeverity >= 6) return 'High';
    if (avgSeverity >= 4) return 'Medium';
    return 'Low';
  }

  /**
   * Helper: Generate mitigation strategies
   */
  private generateMitigationStrategies(risks: any[]): string[] {
    return risks.map((risk) => {
      switch (risk.type) {
        case 'Schedule':
          return 'Review and adjust project timeline, prioritize critical tasks';
        case 'Resource':
          return 'Allocate additional resources or adjust scope';
        case 'Quality':
          return 'Implement code reviews and quality checkpoints';
        case 'Dependency':
          return 'Identify and resolve blockers, establish clear communication channels';
        default:
          return 'Monitor and reassess regularly';
      }
    });
  }

  /**
   * Helper: Generate risk action items
   */
  private generateRiskActionItems(risks: any[]): string[] {
    return risks
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 5)
      .map(
        (risk) =>
          `Address ${risk.type} risk: ${risk.description} (Severity: ${risk.severity}/10)`
      );
  }
}

export const reportService = new ReportService();
