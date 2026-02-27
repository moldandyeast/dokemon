import { DurableObject } from "cloudflare:workers";
import { INITIAL_RATING } from "../../shared/constants";

interface PlayerData {
  dokemonIds: string[];
  rating: number;
}

export class PlayerDO extends DurableObject {
  private async getData(): Promise<PlayerData> {
    return (
      (await this.ctx.storage.get<PlayerData>("data")) ?? {
        dokemonIds: [],
        rating: INITIAL_RATING,
      }
    );
  }

  async addDOkemon(dokemonId: string): Promise<void> {
    const data = await this.getData();
    if (!data.dokemonIds.includes(dokemonId)) {
      data.dokemonIds.push(dokemonId);
      await this.ctx.storage.put("data", data);
    }
  }

  async removeDOkemon(dokemonId: string): Promise<void> {
    const data = await this.getData();
    data.dokemonIds = data.dokemonIds.filter((id) => id !== dokemonId);
    await this.ctx.storage.put("data", data);
  }

  async getDOkemonIds(): Promise<string[]> {
    const data = await this.getData();
    return data.dokemonIds;
  }

  async getRating(): Promise<number> {
    const data = await this.getData();
    return data.rating;
  }

  async updateRating(newRating: number): Promise<void> {
    const data = await this.getData();
    data.rating = newRating;
    await this.ctx.storage.put("data", data);
  }

  async fetch(request: Request): Promise<Response> {
    const data = await this.getData();
    return Response.json(data);
  }
}
