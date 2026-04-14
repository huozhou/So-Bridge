import { Router, type Request, type Response } from "express";
import { renderProfileAdminPage, renderProjectAccessSettingsPage } from "./profile-ui.js";

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isServerSettingsValidationError(error: unknown): boolean {
  return error instanceof Error && error.message === "Server port must be an integer between 1 and 65535";
}

function getRouteParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return null;
}

export function createProfileAdminRouter(service: {
  getCurrentBridge(): Promise<unknown>;
  getResources(): Promise<unknown>;
  createBotIntegration(input: unknown): Promise<unknown>;
  updateBotIntegration(id: string | null, input: unknown): Promise<unknown>;
  deleteBotIntegration(id: string | null): Promise<unknown>;
  createAIAssistant(input: unknown): Promise<unknown>;
  updateAIAssistant(id: string | null, input: unknown): Promise<unknown>;
  deleteAIAssistant(id: string | null): Promise<unknown>;
  createBridgeProfile(input: unknown): Promise<unknown>;
  activateBridgeProfile(profileId: string | null): Promise<unknown>;
  updateDirectoryPolicy(input: unknown): Promise<unknown>;
  updateServerSettings(input: unknown): Promise<unknown>;
}): Router {
  const router = Router();

  router.get("/admin", (_req: Request, res: Response) => {
    res.type("html").send(renderProfileAdminPage());
  });

  router.get("/admin/settings", (_req: Request, res: Response) => {
    res.type("html").send(renderProjectAccessSettingsPage());
  });

  router.get("/api/admin/current-bridge", async (_req: Request, res: Response) => {
    try {
      res.json(await service.getCurrentBridge());
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.get("/api/admin/resources", async (_req: Request, res: Response) => {
    try {
      res.json(await service.getResources());
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.post("/api/admin/bot-integrations", async (req: Request, res: Response) => {
    try {
      res.status(201).json(await service.createBotIntegration(req.body));
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.put("/api/admin/bot-integrations/:id", async (req: Request, res: Response) => {
    try {
      res.json(await service.updateBotIntegration(getRouteParam(req.params.id), req.body));
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.delete("/api/admin/bot-integrations/:id", async (req: Request, res: Response) => {
    try {
      res.json(await service.deleteBotIntegration(getRouteParam(req.params.id)));
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.post("/api/admin/ai-assistants", async (req: Request, res: Response) => {
    try {
      res.status(201).json(await service.createAIAssistant(req.body));
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.put("/api/admin/ai-assistants/:id", async (req: Request, res: Response) => {
    try {
      res.json(await service.updateAIAssistant(getRouteParam(req.params.id), req.body));
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.delete("/api/admin/ai-assistants/:id", async (req: Request, res: Response) => {
    try {
      res.json(await service.deleteAIAssistant(getRouteParam(req.params.id)));
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.post("/api/admin/bridge-profiles", async (req: Request, res: Response) => {
    try {
      res.status(201).json(await service.createBridgeProfile(req.body));
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.post("/api/admin/bridge-profiles/:id/activate", async (req: Request, res: Response) => {
    try {
      const profileId =
        typeof req.params.id === "string"
          ? req.params.id
          : Array.isArray(req.params.id)
            ? (req.params.id[0] ?? null)
            : null;
      res.json(await service.activateBridgeProfile(profileId));
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.put("/api/admin/directory-policy", async (req: Request, res: Response) => {
    try {
      res.json(await service.updateDirectoryPolicy(req.body));
    } catch (error) {
      res.status(500).json({ error: toErrorMessage(error) });
    }
  });

  router.put("/api/admin/server-settings", async (req: Request, res: Response) => {
    try {
      res.json(await service.updateServerSettings(req.body));
    } catch (error) {
      res.status(isServerSettingsValidationError(error) ? 400 : 500).json({ error: toErrorMessage(error) });
    }
  });

  return router;
}
