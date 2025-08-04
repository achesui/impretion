export type ErrorDetails = {
  name: string;
  message: string;
};

export type ServiceResponse<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

export type UserData = {
  organizationId: string;
  userId?: string;
};
