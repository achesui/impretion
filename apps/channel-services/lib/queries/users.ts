import { Client } from "@neondatabase/serverless";

export const getUsersWithLinkedNotifications = async (
  client: Client,
  actionId: string
) => {
  const linkedNotificationsQuery = `
    SELECT *
    FROM linked_notifications
    WHERE action_id = $1;
    `;
  const linkedNotifications = await client.query(linkedNotificationsQuery, [
    actionId,
  ]);
  return linkedNotifications.rows;
};

export const getUserConnectionDetails = async (
  client: Client,
  userId: string
) => {
  const userQuery = `
    SELECT *
    FROM connections
    WHERE user_id = $1;
    `;
  const user = await client.query(userQuery, [userId]);
  return user.rows[0];
};
