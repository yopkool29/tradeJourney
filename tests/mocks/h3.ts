// Mock pour h3
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createError(params: any): Error {
  const error = new Error(params.message);
  Object.assign(error, params);
  return error;
}

export type H3Error = Error & {
  statusCode?: number;
  data?: Record<string, unknown>;
};
