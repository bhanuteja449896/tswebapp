import WebSocket from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface ClientConnection {
  id: string;
  userId: string;
  socket: WebSocket;
  projectIds: Set<string>;
  lastActivity: Date;
}

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export class WebSocketService {
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', this.handleConnection.bind(this));

    // Start ping interval to keep connections alive
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000); // Ping every 30 seconds

    logger.info('WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(socket: WebSocket, request: any): Promise<void> {
    const clientId = this.generateClientId();
    logger.info(`New WebSocket connection: ${clientId}`);

    // Authenticate connection
    const token = this.extractToken(request);
    if (!token) {
      socket.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Authentication required' },
      }));
      socket.close();
      return;
    }

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      
      const client: ClientConnection = {
        id: clientId,
        userId: decoded.userId,
        socket,
        projectIds: new Set(),
        lastActivity: new Date(),
      };

      this.clients.set(clientId, client);

      // Send connection success message
      this.sendToClient(clientId, {
        type: 'connected',
        payload: { clientId, userId: decoded.userId },
        timestamp: new Date(),
      });

      // Set up event handlers
      socket.on('message', (data) => this.handleMessage(clientId, data));
      socket.on('close', () => this.handleDisconnect(clientId));
      socket.on('error', (error) => this.handleError(clientId, error));
      socket.on('pong', () => this.handlePong(clientId));

    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      socket.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid authentication token' },
      }));
      socket.close();
    }
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(clientId: string, data: WebSocket.Data): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message = JSON.parse(data.toString());
      client.lastActivity = new Date();

      switch (message.type) {
        case 'join_project':
          this.handleJoinProject(clientId, message.payload.projectId);
          break;
        case 'leave_project':
          this.handleLeaveProject(clientId, message.payload.projectId);
          break;
        case 'task_update':
          this.broadcastTaskUpdate(message.payload);
          break;
        case 'comment_added':
          this.broadcastCommentAdded(message.payload);
          break;
        case 'user_typing':
          this.broadcastUserTyping(clientId, message.payload);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', payload: {}, timestamp: new Date() });
          break;
        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      this.sendToClient(clientId, {
        type: 'error',
        payload: { message: 'Invalid message format' },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      logger.info(`Client disconnected: ${clientId}`);
      
      // Notify other users in the same projects
      client.projectIds.forEach((projectId) => {
        this.broadcastToProject(projectId, {
          type: 'user_offline',
          payload: { userId: client.userId },
          timestamp: new Date(),
        }, clientId);
      });

      this.clients.delete(clientId);
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(clientId: string, error: Error): void {
    logger.error(`WebSocket error for client ${clientId}:`, error);
    const client = this.clients.get(clientId);
    if (client) {
      client.socket.close();
      this.clients.delete(clientId);
    }
  }

  /**
   * Handle pong response
   */
  private handlePong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  /**
   * Handle join project room
   */
  private handleJoinProject(clientId: string, projectId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.projectIds.add(projectId);
    
    // Notify other users in the project
    this.broadcastToProject(projectId, {
      type: 'user_joined',
      payload: { userId: client.userId, projectId },
      timestamp: new Date(),
    }, clientId);

    logger.info(`Client ${clientId} joined project ${projectId}`);
  }

  /**
   * Handle leave project room
   */
  private handleLeaveProject(clientId: string, projectId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.projectIds.delete(projectId);
    
    // Notify other users in the project
    this.broadcastToProject(projectId, {
      type: 'user_left',
      payload: { userId: client.userId, projectId },
      timestamp: new Date(),
    }, clientId);

    logger.info(`Client ${clientId} left project ${projectId}`);
  }

  /**
   * Broadcast task update to all clients in the project
   */
  private broadcastTaskUpdate(payload: any): void {
    this.broadcastToProject(payload.projectId, {
      type: 'task_updated',
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast new comment to all clients in the project
   */
  private broadcastCommentAdded(payload: any): void {
    this.broadcastToProject(payload.projectId, {
      type: 'comment_added',
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast user typing indicator
   */
  private broadcastUserTyping(clientId: string, payload: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.broadcastToProject(payload.projectId, {
      type: 'user_typing',
      payload: {
        ...payload,
        userId: client.userId,
      },
      timestamp: new Date(),
    }, clientId);
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Send message to specific user (all their connections)
   */
  sendToUser(userId: string, message: WebSocketMessage): void {
    this.clients.forEach((client) => {
      if (client.userId === userId && client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Broadcast message to all clients in a project
   */
  private broadcastToProject(
    projectId: string,
    message: WebSocketMessage,
    excludeClientId?: string
  ): void {
    this.clients.forEach((client, clientId) => {
      if (
        clientId !== excludeClientId &&
        client.projectIds.has(projectId) &&
        client.socket.readyState === WebSocket.OPEN
      ) {
        client.socket.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WebSocketMessage, excludeClientId?: string): void {
    this.clients.forEach((client, clientId) => {
      if (
        clientId !== excludeClientId &&
        client.socket.readyState === WebSocket.OPEN
      ) {
        client.socket.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Ping all clients to keep connections alive
   */
  private pingClients(): void {
    const now = new Date();
    this.clients.forEach((client, clientId) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        // Check if client has been inactive for too long
        const inactiveDuration = now.getTime() - client.lastActivity.getTime();
        if (inactiveDuration > 300000) { // 5 minutes
          logger.info(`Closing inactive connection: ${clientId}`);
          client.socket.close();
          this.clients.delete(clientId);
        } else {
          client.socket.ping();
        }
      } else {
        // Clean up dead connections
        this.clients.delete(clientId);
      }
    });
  }

  /**
   * Extract JWT token from WebSocket request
   */
  private extractToken(request: any): string | null {
    const url = new URL(request.url, `http://${request.headers.host}`);
    return url.searchParams.get('token');
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active clients count
   */
  getActiveClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get active users count
   */
  getActiveUsersCount(): number {
    const uniqueUsers = new Set(
      Array.from(this.clients.values()).map((client) => client.userId)
    );
    return uniqueUsers.size;
  }

  /**
   * Get clients in a project
   */
  getProjectClients(projectId: string): ClientConnection[] {
    return Array.from(this.clients.values()).filter((client) =>
      client.projectIds.has(projectId)
    );
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return Array.from(this.clients.values()).some(
      (client) => client.userId === userId
    );
  }

  /**
   * Notify task assignment
   */
  notifyTaskAssignment(userId: string, task: any): void {
    this.sendToUser(userId, {
      type: 'task_assigned',
      payload: { task },
      timestamp: new Date(),
    });
  }

  /**
   * Notify task status change
   */
  notifyTaskStatusChange(projectId: string, task: any): void {
    this.broadcastToProject(projectId, {
      type: 'task_status_changed',
      payload: { task },
      timestamp: new Date(),
    });
  }

  /**
   * Notify new comment
   */
  notifyNewComment(projectId: string, comment: any): void {
    this.broadcastToProject(projectId, {
      type: 'new_comment',
      payload: { comment },
      timestamp: new Date(),
    });
  }

  /**
   * Notify project update
   */
  notifyProjectUpdate(projectId: string, project: any): void {
    this.broadcastToProject(projectId, {
      type: 'project_updated',
      payload: { project },
      timestamp: new Date(),
    });
  }

  /**
   * Notify user mention
   */
  notifyUserMention(userId: string, mention: any): void {
    this.sendToUser(userId, {
      type: 'user_mentioned',
      payload: { mention },
      timestamp: new Date(),
    });
  }

  /**
   * Send notification to user
   */
  sendNotification(userId: string, notification: any): void {
    this.sendToUser(userId, {
      type: 'notification',
      payload: { notification },
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast system announcement
   */
  broadcastSystemAnnouncement(announcement: string): void {
    this.broadcast({
      type: 'system_announcement',
      payload: { message: announcement },
      timestamp: new Date(),
    });
  }

  /**
   * Send presence update
   */
  sendPresenceUpdate(projectId: string, userId: string, status: string): void {
    this.broadcastToProject(projectId, {
      type: 'presence_update',
      payload: { userId, status },
      timestamp: new Date(),
    });
  }

  /**
   * Clean up and close all connections
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.clients.forEach((client) => {
      client.socket.close();
    });

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    logger.info('WebSocket server shut down');
  }
}

export const webSocketService = new WebSocketService();
