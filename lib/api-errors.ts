import { NextResponse } from "next/server";

/**
 * Shared error handling for API route handlers.
 *
 * Every domain error class in `lib/` (AuthError, PaymentRecommendationError,
 * AdministrationReviewError, SystemAdministrationError, ...) carries an HTTP
 * `status` and usually a machine readable `code`. Those are safe to show to the
 * user. Anything else (Prisma errors, TypeErrors, network failures) is logged
 * on the server and replaced by a generic message so internal details are not
 * leaked to the browser and the response is a proper 500 instead of a
 * misleading 401/403.
 */

export class InvalidRequestError extends Error {
  status = 400;
  code = "INVALID_REQUEST";

  constructor(message = "The request body is not valid JSON.") {
    super(message);
    this.name = "InvalidRequestError";
  }
}

type ExpectedError = Error & { status: number; code?: unknown };

function isExpectedError(error: unknown): error is ExpectedError {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number" &&
    Number.isInteger((error as { status: number }).status) &&
    (error as { status: number }).status >= 400 &&
    (error as { status: number }).status < 600 &&
    // Only our own domain errors use a `status` + Error subclass name pattern.
    error.name !== "Error"
  );
}

/** Prisma P2021 (table missing) / P2022 (column missing): the database needs the schema repair. */
function isSchemaOutOfDateError(error: unknown) {
  const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined;
  return code === "P2021" || code === "P2022";
}

export function apiErrorResponse(error: unknown, fallbackMessage = "An unexpected error occurred.") {
  if (isExpectedError(error)) {
    const code = typeof error.code === "string" ? error.code : undefined;
    return NextResponse.json(
      code ? { error: error.message, code } : { error: error.message },
      { status: error.status },
    );
  }

  console.error(fallbackMessage, error);
  if (isSchemaOutOfDateError(error)) {
    console.error(
      "The database schema is behind prisma/schema.prisma (missing table or column). " +
        "Run the scripts in prisma/repair/ - see prisma/repair/README.md.",
    );
  }
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

/** Parses a JSON object body. Malformed JSON becomes a 400 instead of a 500. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new InvalidRequestError();
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new InvalidRequestError("The request body must be a JSON object.");
  }

  return body as Record<string, unknown>;
}

/** Like readJsonBody, but an empty/malformed body is treated as `{}`. */
export async function readOptionalJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return await readJsonBody(request);
  } catch {
    return {};
  }
}

export function stringField(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value : "";
}
