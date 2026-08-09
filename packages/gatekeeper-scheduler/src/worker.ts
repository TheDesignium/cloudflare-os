import { WorkerEntrypoint } from "cloudflare:workers";
import { ScheduleDriver } from "./schedule-driver.js";

export { ScheduleDriver };
export {
  GatekeeperVendor as default,
  GatekeeperVendor,
  ScheduleAccount,
  ScheduleHookController,
  ScheduleVerifier,
  SchedulerGatekeeper,
} from "./scheduler.js";

export class DataResetEntrypoint extends WorkerEntrypoint<Cloudflare.Env> {
  async purgeDurableObjectForDataReset(className: string, objectId: string): Promise<unknown> {
    if (className === "ScheduleDriver") {
      let ns = this.ctx.exports.ScheduleDriver;
      return ns.get(ns.idFromString(objectId)).purgeForDataReset();
    }
    if (className === "SchedulerGatekeeper") {
      let ns = this.ctx.exports.SchedulerGatekeeper;
      return ns.get(ns.idFromString(objectId)).purgeForDataReset();
    }
    throw new Error(`Unsupported Scheduler reset class: ${className}`);
  }
}
