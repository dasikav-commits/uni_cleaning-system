import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/api-errors";
import { getFinalReport } from "@/lib/final-reports";
import { generateFinalPdf } from "@/lib/final-report-files";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ year: string; month: string }> }) {
  try {
    const { appUser } = await requireRole("GAA");
    const values = await params;
    const year = Number(values.year);
    const month = Number(values.month);
    const report = await getFinalReport(prisma, appUser, year, month);
    const file = await generateFinalPdf(report);
    const period = `${year}-${String(month).padStart(2, "0")}`;
    await prisma.activityLog.create({
      data: {
        userId: appUser.id,
        action: "FINAL_REPORT_PDF_GENERATED",
        entityType: "FinalReport",
        entityId: period,
        description: "Final report PDF generated.",
        metadata: { year, month },
      },
    });
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="University_Cleaning_Final_All_Locations_Report_${year}_${String(month).padStart(2, "0")}.pdf"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, "Unable to generate PDF.");
  }
}
