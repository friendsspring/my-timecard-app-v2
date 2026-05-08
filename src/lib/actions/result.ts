export type ActionError = {
  code:
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "ALREADY_OPEN"
    | "INTERNAL_ERROR";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: ActionError): ActionResult<never> {
  return { ok: false, error };
}

export function validationFail(fieldErrors: Record<string, string[]>): ActionResult<never> {
  return {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "入力内容に誤りがあります。",
      fieldErrors,
    },
  };
}
