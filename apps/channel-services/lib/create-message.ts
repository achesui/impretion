import { Twilio } from "twilio";

type CreateMessageProps = {
    twilio: Twilio;
    message: string;
}

export async function createMessage({ twilio, message }: CreateMessageProps) {
    return await twilio.messages.create({
        from: 'whatsapp:+14155238886',
        body: message,
        to: 'whatsapp:+573146816140'
    });
}