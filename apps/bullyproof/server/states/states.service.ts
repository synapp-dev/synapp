import {
  getStatesSchema,
  getStateByIdSchema,
  getStateByCodeSchema,
  type GetStatesParams,
  type GetStateByIdParams,
  type GetStateByCodeParams,
} from "./states.validators";
import { statesRepo } from "./states.repo";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanViewStates(ctx: AuthContext) {
  // States are public data - no authentication required
  return;
}

export const statesService = {
  async getStates(ctx: AuthContext, query: unknown) {
    const params: GetStatesParams = getStatesSchema.parse(query);
    await assertCanViewStates(ctx);

    return await statesRepo.getAll();
  },

  async getStateById(ctx: AuthContext, params: unknown) {
    const { id } = getStateByIdSchema.parse(params);
    await assertCanViewStates(ctx);
    
    const state = await statesRepo.getById(id);
    return state[0] ?? null;
  },

  async getStateByCode(ctx: AuthContext, params: unknown) {
    const { code } = getStateByCodeSchema.parse(params);
    await assertCanViewStates(ctx);
    
    const state = await statesRepo.getByCode(code);
    return state[0] ?? null;
  },
};
