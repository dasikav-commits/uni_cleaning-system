import { NextResponse } from "next/server";
import { InvalidRequestError, readJsonBody } from "@/lib/api-errors";
import { AuthError, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  activateManagedPHIAssignment,
  deactivateManagedPHIAssignment,
  getManagedPHIAssignmentById,
  PHIAssignmentError,
  type UpdatePHIAssignmentInput,
  updateManagedPHIAssignment,
} from "@/lib/phi-assignments";

function toErrorResponse(error: unknown) {
  if (error instanceof InvalidRequestError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  if (error instanceof AuthError || error instanceof PHIAssignmentError) {
    const code = "code" in error && typeof error.code === "string" ? error.code : "AUTH_ERROR";
    return NextResponse.json({ error: error.message, code }, { status: error.status });
  }

  return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("GAA");
    const { id } = await context.params;
    const assignment = await getManagedPHIAssignmentById(prisma, id);

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found.", code: "ASSIGNMENT_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { appUser } = await requireRole("GAA");
    const { id } = await context.params;
    const body = await readJsonBody(request);

    const input: UpdatePHIAssignmentInput = {};

    if (typeof body.active === "boolean") {
      input.active = body.active;
    }

    if (typeof body.active === "boolean" && Object.keys(input).length === 1) {
      const result = body.active
        ? await activateManagedPHIAssignment(
            prisma,
            { id: appUser.id, name: appUser.name },
            id,
          )
        : await deactivateManagedPHIAssignment(
            prisma,
            { id: appUser.id, name: appUser.name },
            id,
          );

      return NextResponse.json({ assignment: result.assignment });
    }

    const result = await updateManagedPHIAssignment(
      prisma,
      { id: appUser.id, name: appUser.name },
      id,
      input,
    );

    return NextResponse.json({ assignment: result.assignment });
  } catch (error) {
    return toErrorResponse(error);
  }
}
