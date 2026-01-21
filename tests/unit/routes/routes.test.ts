import { authRoutes } from '../../../src/routes/authRoutes';
import { projectRoutes } from '../../../src/routes/projectRoutes';
import { taskRoutes } from '../../../src/routes/taskRoutes';
import { userRoutes } from '../../../src/routes/userRoutes';

describe('Routes', () => {
  describe('Auth Routes', () => {
    it('should export router', () => {
      expect(authRoutes).toBeDefined();
    });

    it('should have register endpoint', () => {
      const routes = authRoutes.stack
        .filter((r: any) => r.route)
        .map((r: any) => ({
          path: r.route.path,
          methods: Object.keys(r.route.methods),
        }));

      const registerRoute = routes.find((r: any) =>
        r.path.includes('register')
      );
      expect(registerRoute).toBeDefined();
    });

    it('should have login endpoint', () => {
      const routes = authRoutes.stack
        .filter((r: any) => r.route)
        .map((r: any) => r.route.path);

      expect(routes.some((path: string) => path.includes('login'))).toBe(true);
    });
  });

  describe('Project Routes', () => {
    it('should export router', () => {
      expect(projectRoutes).toBeDefined();
    });

    it('should have CRUD endpoints', () => {
      const routes = projectRoutes.stack
        .filter((r: any) => r.route)
        .map((r: any) => ({
          path: r.route.path,
          methods: Object.keys(r.route.methods),
        }));

      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('Task Routes', () => {
    it('should export router', () => {
      expect(taskRoutes).toBeDefined();
    });

    it('should have CRUD endpoints', () => {
      const routes = taskRoutes.stack
        .filter((r: any) => r.route)
        .map((r: any) => r.route.path);

      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('User Routes', () => {
    it('should export router', () => {
      expect(userRoutes).toBeDefined();
    });

    it('should have user management endpoints', () => {
      const routes = userRoutes.stack
        .filter((r: any) => r.route)
        .map((r: any) => r.route.path);

      expect(routes.length).toBeGreaterThan(0);
    });
  });
});
