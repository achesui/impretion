import { Twilio } from "twilio";
import { SubaccountTokens } from "./twilio-types";

export const twilioClient = ({ accountSid, authToken }: SubaccountTokens) =>
  new Twilio(accountSid, authToken);
